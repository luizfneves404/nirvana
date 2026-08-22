import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { USD_PER_SESSION_SECOND } from "../../shared/realtime.ts";
import {
  costForSeconds,
  getUsage,
  resetUsage,
  startSessionClock,
  stopSessionClock,
} from "./voice-usage.ts";

/**
 * The meter is the only thing standing between a forgotten open session and a
 * surprise bill, so the arithmetic and the clock are tested directly.
 */
describe("costForSeconds", () => {
  it("prices a minute at the Gateway's published rate", () => {
    expect(costForSeconds(60)).toBeCloseTo(USD_PER_SESSION_SECOND * 60, 12);
  });

  it("costs nothing before a session opens", () => {
    expect(costForSeconds(0)).toBe(0);
  });
});

describe("the session clock", () => {
  afterEach(() => {
    stopSessionClock();
    resetUsage();
    vi.useRealTimers();
  });

  it("banks wall-clock time while the session is open", async () => {
    vi.useFakeTimers();
    resetUsage();

    startSessionClock();
    await vi.advanceTimersByTimeAsync(5_000);

    // Ticked while live, without waiting for the session to end.
    expect(getUsage().seconds).toBeCloseTo(5, 2);
    expect(getUsage().sessions).toBe(1);

    stopSessionClock();
    await vi.advanceTimersByTimeAsync(10_000);

    // A closed session stops costing money.
    expect(getUsage().seconds).toBeCloseTo(5, 2);
  });

  it("counts each session and keeps the running total across them", async () => {
    vi.useFakeTimers();
    resetUsage();

    startSessionClock();
    await vi.advanceTimersByTimeAsync(2_000);
    stopSessionClock();

    startSessionClock();
    await vi.advanceTimersByTimeAsync(3_000);
    stopSessionClock();

    expect(getUsage().sessions).toBe(2);
    expect(getUsage().seconds).toBeCloseTo(5, 2);
  });

  it("ignores a second start while one is already running", async () => {
    vi.useFakeTimers();
    resetUsage();

    startSessionClock();
    startSessionClock();
    await vi.advanceTimersByTimeAsync(1_000);
    stopSessionClock();

    expect(getUsage().sessions).toBe(1);
  });
});
