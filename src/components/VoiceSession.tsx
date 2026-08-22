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
import { recordOutputAudio, recordSessionStart } from "../lib/voice-usage.ts";

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
  // Server-side VAD: the model decides when a turn ends, so there is no
  // push-to-talk button.
  turnDetection: { type: "server-vad" },
} satisfies NonNullable<Experimental_UseRealtimeOptions["sessionConfig"]>;

/**
 * One conversation. The parent remounts this with a new `key` to clear it —
 * the hook keeps its store in a ref, so a remount is what starts a fresh one.
 */
export default function VoiceSession({ password }: { password: string }) {
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const realtime = experimental_useRealtime({
    model: voiceModel,
    api: { token: realtimeSetupUrl(password) },
    sessionConfig,
    sampleRate: AUDIO_SAMPLE_RATE,
    onEvent: (event) => {
      // Every chunk of generated audio, which is also what xAI bills for.
      if (event.type === "audio-delta") recordOutputAudio(event.delta);
    },
    onError: (sessionError) => setError(sessionError.message),
  });

  const { status, messages, isCapturing, isPlaying, startAudioCapture } = realtime;

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
    try {
      // Requested inside the click so the permission prompt lands in the
      // user's gesture, and so the AudioContext is allowed to make sound.
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was denied.");
      return;
    }

    recordSessionStart();
    await realtime.connect();
  };

  const stop = () => {
    realtime.stopAudioCapture();
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    realtime.disconnect();
  };

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
      </div>

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
