import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type VoiceEvent =
  | { event: "wake"; score: number }
  | { event: "transcript"; text: string }
  | { event: "error"; message: string };

export interface VoiceCallbacks {
  onWake?: () => void;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

/**
 * Starts/stops the Rust-side voice listener + speak daemon (see
 * apps/desktop/backend/src/voice.rs) as `enabled` changes, and forwards
 * the "voice-event" Tauri events it emits to the given callbacks. This is
 * the one place STT output crosses from Rust into commandEngine.ts's
 * parseCommand/executeCommand -- see App.tsx's handleVoiceTranscript.
 */
export function useVoiceListener(enabled: boolean, callbacks: VoiceCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!enabled) return;

    let unlisten: UnlistenFn | undefined;
    let cancelled = false;

    (async () => {
      unlisten = await listen<VoiceEvent>("voice-event", (e) => {
        const payload = e.payload;
        if (payload.event === "wake") callbacksRef.current.onWake?.();
        else if (payload.event === "transcript") callbacksRef.current.onTranscript(payload.text);
        else if (payload.event === "error") callbacksRef.current.onError?.(payload.message);
      });
      if (cancelled) return;
      await invoke("start_voice_listener");
      await invoke("start_speak_daemon");
    })();

    return () => {
      cancelled = true;
      unlisten?.();
      invoke("stop_voice_listener").catch(() => {});
      invoke("stop_speak_daemon").catch(() => {});
    };
  }, [enabled]);
}
