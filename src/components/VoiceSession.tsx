import { experimental_useRealtime, type Experimental_UseRealtimeOptions } from "@ai-sdk/react";
import { IonButton, IonChip, IonIcon, IonNote, IonSpinner, IonText } from "@ionic/react";
import { gateway } from "ai";
import { micOffOutline, micOutline, volumeHighOutline } from "ionicons/icons";
import { useEffect, useRef, useState } from "react";

import {
  AUDIO_FORMAT_TYPE,
  AUDIO_SAMPLE_RATE,
  VOICE_MODEL_ID,
  VOICE_NAME,
} from "../../shared/realtime.ts";
import { realtimeSetupUrl } from "../lib/api.ts";
import { startSessionClock, stopSessionClock } from "../lib/voice-usage.ts";

/**
 * Both of these are compared by identity inside the hook: a fresh object on
 * every render tears the session down and rebuilds it in a loop. They are
 * module constants for that reason, not as a micro-optimization.
 *
 * `gateway.experimental_realtime(...)` is safe in the browser — it holds no
 * credential. Minting the token is what needs the Gateway key, and that happens
 * on the Worker.
 */
const voiceModel = gateway.experimental_realtime(VOICE_MODEL_ID);

const sessionConfig = {
  instructions:
    "You are Nirvana, a friendly voice assistant. Keep replies short and " +
    "conversational — one or two sentences unless asked for more.",
  voice: VOICE_NAME,
  // Stated explicitly so the browser's capture/playback rate and the model's
  // format cannot disagree. Omit these and the provider picks its own.
  inputAudioFormat: { type: AUDIO_FORMAT_TYPE, rate: AUDIO_SAMPLE_RATE },
  outputAudioFormat: { type: AUDIO_FORMAT_TYPE, rate: AUDIO_SAMPLE_RATE },
  // The transcript below is built entirely from transcription events. Asking
  // for both directions explicitly beats relying on a provider default —
  // without them the audio still works and the page just looks empty.
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  // Server-side VAD: the model decides when a turn ends, so there is no
  // push-to-talk button.
  turnDetection: { type: "server-vad" },
} satisfies NonNullable<Experimental_UseRealtimeOptions["sessionConfig"]>;

/**
 * One conversation. The parent remounts this with a new `key` to clear it —
 * the hook keeps its store in a ref, so a remount is what starts a fresh one.
 */
/**
 * Billing runs on wall-clock time, so an unattended open session is a leak.
 * Two guards close it: leaving the tab, and going quiet for this long.
 */
const IDLE_TIMEOUT_MS = 2 * 60_000;
const IDLE_CHECK_MS = 5_000;

export default function VoiceSession({ password }: { password: string }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastActivityRef = useRef(0);

  const realtime = experimental_useRealtime({
    model: voiceModel,
    api: { token: realtimeSetupUrl(password) },
    sessionConfig,
    sampleRate: AUDIO_SAMPLE_RATE,
    onEvent: (event) => {
      if (
        event.type === "speech-started" ||
        event.type === "audio-delta" ||
        event.type === "input-transcription-completed"
      ) {
        lastActivityRef.current = Date.now();
      }
    },
    onError: (sessionError) => setError(sessionError.message),
  });

  const { status, messages, events, isCapturing, isPlaying, startAudioCapture } = realtime;

  /**
   * The Gateway bills by the second the session is open, so the meter runs off
   * the connection itself. Stopping on unmount matters: the Clear button
   * remounts this component, and a clock left running would keep charging for a
   * socket that no longer exists.
   */
  useEffect(() => {
    if (status !== "connected") return;

    startSessionClock();
    return () => stopSessionClock();
  }, [status]);

  /**
   * Events sent before the socket opens are dropped, so capture waits for
   * `connected` (which the SDK sets on the session-created event) rather than
   * starting right after `connect()` resolves.
   */
  useEffect(() => {
    if (status !== "connected" || isCapturing) return;

    const stream = streamRef.current;
    if (stream) startAudioCapture(stream);
  }, [status, isCapturing, startAudioCapture]);

  /* Release the microphone if the page navigates away mid-conversation. */
  useEffect(() => {
    return () => {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    };
  }, []);

  const start = async () => {
    setError(null);
    setNotice(null);
    try {
      // Requested inside the click so the permission prompt lands in the
      // user's gesture, and so the AudioContext is allowed to make sound.
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was denied.");
      return;
    }

    await realtime.connect();
  };

  const stop = () => {
    realtime.stopAudioCapture();
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    realtime.disconnect();
  };

  /**
   * Held in a ref so the guards below can depend on `status` alone. The hook
   * re-binds its methods every render, so putting `stop` in a dependency array
   * would tear the idle timer down before it ever fires.
   */
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });

  /**
   * The two ways an open session quietly costs money: the tab goes to the
   * background (another app, a locked phone) or it is left connected in an
   * empty room. Both hang up rather than keep the meter running.
   */
  useEffect(() => {
    if (status !== "connected") return;

    lastActivityRef.current = Date.now();

    const hangUp = (why: string) => {
      setNotice(why);
      stopRef.current();
    };

    const onVisibilityChange = () => {
      if (document.hidden)
        hangUp("Hung up when the tab went to the background — it bills by the second.");
    };

    /* Closing the tab kills the socket; this banks the last seconds locally. */
    const onPageHide = () => stopSessionClock();

    const idleTimer = setInterval(() => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        hangUp("Hung up after two minutes of silence.");
      }
    }, IDLE_CHECK_MS);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(idleTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [status]);

  const isLive = status === "connected" || status === "connecting";

  return (
    <>
      <div className="voice-controls">
        {isLive ? (
          <IonButton color="danger" expand="block" onClick={stop}>
            <IonIcon slot="start" icon={micOffOutline} />
            End conversation
          </IonButton>
        ) : (
          <IonButton expand="block" onClick={() => void start()}>
            <IonIcon slot="start" icon={micOutline} />
            Start talking
          </IonButton>
        )}

        <div className="voice-status">
          <IonChip color={status === "connected" ? "success" : "medium"}>
            {status === "connecting" && <IonSpinner name="dots" />}
            {status}
          </IonChip>
          {isCapturing && (
            <IonChip color="primary">
              <IonIcon icon={micOutline} />
              listening
            </IonChip>
          )}
          {isPlaying && (
            <IonChip color="secondary">
              <IonIcon icon={volumeHighOutline} />
              speaking
            </IonChip>
          )}
        </div>

        {error != null && (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        )}

        {notice != null && <IonNote>{notice}</IonNote>}
      </div>

      {/**
       * Dev-only, and the fastest way to tell the two bring-up failures apart:
       * `audio-delta` arriving with nothing audible is the playback path, no
       * `audio-delta` at all is the session config.
       */}
      {import.meta.env.DEV && events.length > 0 && (
        <pre className="voice-events">
          {events
            .slice(-12)
            .map((event) => event.type)
            .join(" · ")}
        </pre>
      )}

      {messages.length === 0 ? (
        <IonNote className="voice-empty">
          Nothing said yet. Hit start, allow the microphone, and just talk — {VOICE_MODEL_ID}{" "}
          answers out loud and the transcript shows up here.
        </IonNote>
      ) : (
        <div className="voice-transcript">
          {messages.map((message) => (
            <div key={message.id} className={`voice-turn voice-turn--${message.role}`}>
              <span className="voice-turn__role">{message.role}</span>
              <p>{message.parts.map((part) => (part.type === "text" ? part.text : "")).join("")}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
