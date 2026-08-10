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
      try {
        const unlistenResult = await listen<VoiceEvent>("voice-event", (e) => {
          const payload = e.payload;
          if (payload.event === "wake") callbacksRef.current.onWake?.();
          else if (payload.event === "transcript") callbacksRef.current.onTranscript(payload.text);
          else if (payload.event === "error") callbacksRef.current.onError?.(payload.message);
        });
        if (cancelled) {
          // Cleanup already ran before this async listen() resolved --
          // React 18 StrictMode double-invokes effects in dev (mount ->
          // cleanup -> mount again), and the old code only skipped the
          // rest of the setup here without unregistering the listener it
          // just got, leaking it. Hit live 2026-08-10: every voice
          // transcript was handled twice (spoken and logged twice) because
          // two listeners ended up registered for the same "voice-event".
          unlistenResult();
          return;
        }
        unlisten = unlistenResult;
        await invoke("start_voice_listener");
        await invoke("start_speak_daemon");
      } catch (e) {
        // A spawn failure (bad venv path, missing config, etc.) previously
        // vanished as an unhandled promise rejection -- surface it the same
        // way a listen_loop.py-reported error would, so it's visible without
        // opening devtools (found live, 2026-08-10: toggling voice on
        // produced no visible effect and no running process, with nothing
        // in the Tauri dev log either).
        callbacksRef.current.onError?.(
          `Failed to start voice listener: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
      invoke("stop_voice_listener").catch(() => {});
      invoke("stop_speak_daemon").catch(() => {});
    };
  }, [enabled]);
}
