import { describe, expect, it } from "vite-plus/test";

import { AUDIO_SAMPLE_RATE, USD_PER_OUTPUT_AUDIO_MINUTE } from "../../shared/realtime.ts";
import { base64AudioSeconds, usageToUsd } from "./voice-usage.ts";

/**
 * The billing meter is only as good as this arithmetic, so it is tested
 * directly rather than through the store.
 */
describe("base64AudioSeconds", () => {
  /** One second of PCM16 mono at 24 kHz = 48,000 bytes = 64,000 base64 chars. */
  const oneSecond = "A".repeat((AUDIO_SAMPLE_RATE * 2 * 4) / 3);

  it("converts a chunk of PCM16 to seconds", () => {
    expect(base64AudioSeconds(oneSecond)).toBe(1);
  });

  it("does not count padding as payload", () => {
    // 8 chars = 6 bytes; with `==` only 4 of them are real.
    expect(base64AudioSeconds("AAAAAA==")).toBeCloseTo(4 / 2 / AUDIO_SAMPLE_RATE, 12);
    expect(base64AudioSeconds("AAAAAAA=")).toBeCloseTo(5 / 2 / AUDIO_SAMPLE_RATE, 12);
  });

  it("handles an empty delta", () => {
    expect(base64AudioSeconds("")).toBe(0);
  });
});

describe("usageToUsd", () => {
  it("prices a minute of generated audio at the published rate", () => {
    expect(usageToUsd({ outputAudioSeconds: 60, sessions: 1, startedAt: null })).toBeCloseTo(
      USD_PER_OUTPUT_AUDIO_MINUTE,
      12,
    );
  });

  it("costs nothing before anything is spoken", () => {
    expect(usageToUsd({ outputAudioSeconds: 0, sessions: 0, startedAt: null })).toBe(0);
  });
});
