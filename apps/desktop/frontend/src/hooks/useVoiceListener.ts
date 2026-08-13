import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type VoiceEvent =
  | { event: "wake"; score: number }
  | { event: "transcript"; text: string }
  | { event: "error"; message: string }
  | { event: "status"; message: string }
  // 2026-08-13, gemini_live_listen.py only -- see voice.rs's VoiceEvent
  // enum for why these are separate from "transcript" above rather than
  // reusing it: a live conversation has both sides' utterances (role),
  // and its own start/end lifecycle a turn-based classic exchange
  // doesn't need.
  | { event: "live_session_start" }
  | { event: "live_transcript"; role: "user" | "jarvis"; text: string }
  | { event: "live_session_end" };

export interface VoiceCallbacks {
  onWake?: () => void;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  /** Rust-originated lifecycle notifications (crash detected, restarting,
   * reconnected, gave up after too many crashes) -- see voice.rs's crash
   * recovery. Distinct from onError since these aren't necessarily bad
   * news (a successful auto-reconnect is worth telling the user about,
   * not flashing as an error). */
  onStatus?: (message: string) => void;
  /** gemini_live engine only. A live conversation opened after the wake
   * word fired -- distinct from onWake/onTranscript's one-shot classic
   * cycle, since a live session can carry many exchanges before it ends. */
  onLiveSessionStart?: () => void;
  onLiveTranscript?: (role: "user" | "jarvis", text: string) => void;
  onLiveSessionEnd?: () => void;
}

/**
 * Starts/stops the Rust-side voice listener (+ speak daemon, classic
 * engine only -- gemini_live_listen.py handles its own audio output, no
 * separate daemon) as `enabled` changes, and forwards the "voice-event"
 * Tauri events it emits to the given callbacks. This is the one place
 * STT output crosses from Rust into commandEngine.ts's
 * parseCommand/executeCommand -- see App.tsx's handleVoiceTranscript.
 *
 * `engine`: "classic" (default) or "gemini_live" -- passed straight
 * through to voice.rs's start_voice_listener, which picks the script.
 * Not itself validated here; an unrecognized value falls back to
 * classic on the Rust side (see listener_script_for_engine).
 */
export function useVoiceListener(enabled: boolean, engine: string, callbacks: VoiceCallbacks) {
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
          else if (payload.event === "status") callbacksRef.current.onStatus?.(payload.message);
          else if (payload.event === "live_session_start") callbacksRef.current.onLiveSessionStart?.();
          else if (payload.event === "live_transcript")
            callbacksRef.current.onLiveTranscript?.(payload.role, payload.text);
          else if (payload.event === "live_session_end") callbacksRef.current.onLiveSessionEnd?.();
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
        await invoke("start_voice_listener", { engine });
        // gemini_live_listen.py speaks its own responses directly (real-
        // time audio out as part of the live session) -- starting the
        // classic speak_daemon.py alongside it would just be an idle,
        // unused second process, and re-introduces exactly the kind of
        // shared-state surface (speaking.flag) Milestone "two voice bugs"
        // (2026-08-13) closed for the classic engine specifically because
        // it's fragile with more than one process touching it.
        if (engine !== "gemini_live") {
          await invoke("start_speak_daemon");
        }
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
      if (engine !== "gemini_live") {
        invoke("stop_speak_daemon").catch(() => {});
      }
    };
  }, [enabled, engine]);
}
