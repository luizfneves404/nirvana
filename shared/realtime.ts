/**
 * Shared between the Worker and the SPA. Compiled by both tsconfig.app.json
 * and tsconfig.worker.json, so keep this file runtime-agnostic — no Node,
 * DOM, or Workers globals.
 */

/**
 * xAI's flagship voice-to-voice model — "Grok voice 2" — reached through the
 * Vercel AI Gateway, which is why the id carries the `spacexai/` prefix.
 *
 * Only the id used *server-side* actually selects a model: it is baked into the
 * WebSocket URL that comes back with the token (`?ai-model-id=...`). The
 * browser's copy just names the same session.
 */
export const VOICE_MODEL_ID = "spacexai/grok-voice-think-fast-2.0";

/** One of xAI's built-in voices. */
export const VOICE_NAME = "eve";

/**
 * PCM16 mono at 24 kHz. Stated explicitly: with no audio config the session
 * falls back to the provider's own default while the browser captures and plays
 * at `sampleRate`. A mismatch there is garbled audio, not an error.
 */
export const AUDIO_FORMAT_TYPE = "audio/pcm";
export const AUDIO_SAMPLE_RATE = 24_000;
export const AUDIO_BYTES_PER_SAMPLE = 2;

/** The browser only needs the token long enough to open the socket. */
export const REALTIME_TOKEN_TTL_SECONDS = 60;

/**
 * xAI bills speech-to-speech by the minute of generated audio, not by token.
 * Published rate for grok-voice-think-fast-2.0 as of 2026-08-22:
 * https://docs.x.ai/developers/pricing#voice-api-pricing
 *
 * The Gateway's own `getSpendReport()` would be authoritative, but it is a
 * paid-plan feature, so the app meters the audio it receives instead.
 */
export const USD_PER_OUTPUT_AUDIO_MINUTE = 0.08;

/**
 * `experimental_useRealtime` fetches the setup endpoint itself and does not let
 * us add headers, so the shared password rides in the query string. It is a
 * bot deterrent on a public URL, not real authentication.
 */
export const PASSWORD_QUERY_PARAM = "key";
