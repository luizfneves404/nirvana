import { useSyncExternalStore } from "react";

import { USD_PER_SESSION_SECOND } from "../../shared/realtime.ts";

/**
 * Running total of what the voice sessions have cost, kept in localStorage so a
 * page reload does not reset it.
 *
 * The Gateway bills realtime by *session duration*, so the meter is a clock:
 * it runs from the moment the socket is live until it closes. While a session
 * is open the total is recomputed (and persisted) once a second, which is what
 * makes it a live readout rather than an after-the-fact one.
 */
export type VoiceUsage = {
  /** Wall-clock seconds connected, across all sessions. */
  seconds: number;
  /** How many sessions have been opened. */
  sessions: number;
};

const STORAGE_KEY = "astro.voice-usage.v2";

const EMPTY: VoiceUsage = { seconds: 0, sessions: 0 };

const TICK_MS = 1000;

export function costForSeconds(seconds: number): number {
  return seconds * USD_PER_SESSION_SECOND;
}

export function usageToUsd(usage: VoiceUsage): number {
  return costForSeconds(usage.seconds);
}

/**
 * localStorage throws outright in some privacy modes and does not exist in the
 * node test environment, so every access is guarded and a failure just means
 * the total lives for this page load only.
 */
function read(): VoiceUsage {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw == null) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;

    const { seconds, sessions } = parsed as Partial<VoiceUsage>;
    return {
      seconds: typeof seconds === "number" ? seconds : 0,
      sessions: typeof sessions === "number" ? sessions : 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Everything already banked. The live session's seconds are not in here yet. */
let banked: VoiceUsage = read();

/** Snapshot handed to React. Replaced (new identity) only when it changes. */
let current: VoiceUsage = banked;

let liveSince: number | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<() => void>();

function persist(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(banked));
  } catch {
    // Storage unavailable — the in-memory total still works.
  }
}

function publish(next: VoiceUsage): void {
  current = next;
  for (const listener of listeners) listener();
}

function liveSeconds(): number {
  return liveSince == null ? 0 : (Date.now() - liveSince) / 1000;
}

/**
 * Folds the elapsed time into the banked total and restarts the clock from now,
 * so a crash or a closed tab loses at most one tick.
 */
function bankElapsed(): void {
  if (liveSince == null) return;

  banked = { ...banked, seconds: banked.seconds + liveSeconds() };
  liveSince = Date.now();
  persist();
}

export function startSessionClock(): void {
  if (liveSince != null) return;

  banked = { ...banked, sessions: banked.sessions + 1 };
  liveSince = Date.now();
  persist();

  ticker ??= setInterval(() => {
    bankElapsed();
    publish(banked);
  }, TICK_MS);

  publish(banked);
}

export function stopSessionClock(): void {
  bankElapsed();
  liveSince = null;

  if (ticker != null) {
    clearInterval(ticker);
    ticker = null;
  }

  publish(banked);
}

export function resetUsage(): void {
  banked = EMPTY;
  if (liveSince != null) liveSince = Date.now();
  persist();
  publish(banked);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): VoiceUsage {
  return current;
}

export function getUsage(): VoiceUsage {
  return current;
}

export function useVoiceUsage(): VoiceUsage {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
