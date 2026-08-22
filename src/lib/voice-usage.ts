import { useSyncExternalStore } from "react";

import {
  AUDIO_BYTES_PER_SAMPLE,
  AUDIO_SAMPLE_RATE,
  USD_PER_OUTPUT_AUDIO_MINUTE,
} from "../../shared/realtime.ts";

/**
 * Running total of what the voice sessions have cost, kept in localStorage so a
 * page reload does not reset it.
 *
 * xAI does not send a usage/cost field we can read, and it bills speech-to-
 * speech per minute of *generated* audio — so the meter is the generated audio
 * itself: every `audio-delta` carries base64 PCM16 at a known sample rate, and
 * bytes divide straight into seconds. That makes this an estimate of the billed
 * quantity, not a reading of the bill.
 */
export type VoiceUsage = {
  /** Seconds of audio the model has generated, across all sessions. */
  outputAudioSeconds: number;
  /** How many times a session has been connected. */
  sessions: number;
  /** Epoch ms of the first metered audio, for "since <date>" in the UI. */
  startedAt: number | null;
};

const STORAGE_KEY = "nirvana.voice-usage.v1";

const EMPTY: VoiceUsage = { outputAudioSeconds: 0, sessions: 0, startedAt: null };

/**
 * Seconds of PCM16 audio in a base64 chunk, counted without decoding it: 4
 * base64 characters encode 3 bytes, and `=` padding is not payload.
 */
export function base64AudioSeconds(base64: string): number {
  if (base64.length === 0) return 0;

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.max(0, (base64.length * 3) / 4 - padding);

  return bytes / AUDIO_BYTES_PER_SAMPLE / AUDIO_SAMPLE_RATE;
}

export function usageToUsd(usage: VoiceUsage): number {
  return (usage.outputAudioSeconds / 60) * USD_PER_OUTPUT_AUDIO_MINUTE;
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

    const { outputAudioSeconds, sessions, startedAt } = parsed as Partial<VoiceUsage>;
    return {
      outputAudioSeconds: typeof outputAudioSeconds === "number" ? outputAudioSeconds : 0,
      sessions: typeof sessions === "number" ? sessions : 0,
      startedAt: typeof startedAt === "number" ? startedAt : null,
    };
  } catch {
    return EMPTY;
  }
}

let usage: VoiceUsage = read();

const listeners = new Set<() => void>();

/**
 * Audio deltas arrive dozens of times a second. The total updates immediately,
 * but subscribers and localStorage are only touched on a timer so the UI is not
 * re-rendered per chunk.
 */
let flushHandle: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 500;

function flush(): void {
  flushHandle = null;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Storage unavailable — the in-memory total still works.
  }
  for (const listener of listeners) listener();
}

function scheduleFlush(): void {
  flushHandle ??= setTimeout(flush, FLUSH_MS);
}

export function recordOutputAudio(base64: string): void {
  usage = {
    ...usage,
    outputAudioSeconds: usage.outputAudioSeconds + base64AudioSeconds(base64),
    startedAt: usage.startedAt ?? Date.now(),
  };
  scheduleFlush();
}

export function recordSessionStart(): void {
  usage = { ...usage, sessions: usage.sessions + 1 };
  flush();
}

export function resetUsage(): void {
  usage = EMPTY;
  flush();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): VoiceUsage {
  return usage;
}

export function useVoiceUsage(): VoiceUsage {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
