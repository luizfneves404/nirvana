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
 * The Gateway's own published rates for this model, from
 * `curl https://ai-gateway.vercel.sh/v1/models` → `pricing`:
 *
 *   realtime_session_duration_cost_per_second: 0.001334   ($0.08/min)
 *   realtime_client_message_cost:              0.004
 *
 * Note what the meter is charging for: **wall-clock time connected**, not
 * minutes of speech. Silence costs the same as talking, so leaving a session
 * open is the expensive mistake.
 *
 * The Gateway's `getSpendReport()` would be the actual invoice, but it needs a
 * paid plan — so the footer counts seconds locally and prices them here.
 */
export const USD_PER_SESSION_SECOND = 0.001334;

/**
 * Charged per text message the client sends. This UI is voice-only and never
 * calls `sendTextMessage`, so it contributes nothing today.
 */
export const USD_PER_CLIENT_TEXT_MESSAGE = 0.004;

/**
 * `experimental_useRealtime` fetches the setup endpoint itself and does not let
 * us add headers, so the shared password rides in the query string. It is a
 * bot deterrent on a public URL, not real authentication.
 */
export const PASSWORD_QUERY_PARAM = "key";
