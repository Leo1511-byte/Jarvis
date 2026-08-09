import "./JarvisCore.css";

/**
 * Core states from UI_DESIGN.md / spec §18. Only a subset of transitions
 * are wired to anything real yet (this component just renders whatever
 * state prop it's given) — the command engine (Milestone 5) and voice
 * loop (Milestone 9) are what will actually drive state changes.
 */
export type CoreState =
  | "idle"
  | "wake-word-active"
  | "listening"
  | "processing"
  | "working"
  | "waiting-for-approval"
  | "speaking"
  | "success"
  | "error"
  | "offline";

const STATE_LABEL: Record<CoreState, string> = {
  idle: "IDLE",
  "wake-word-active": "WAKE WORD ACTIVE",
  listening: "LISTENING",
  processing: "PROCESSING",
  working: "WORKING",
  "waiting-for-approval": "WAITING FOR APPROVAL",
  speaking: "SPEAKING",
  success: "SUCCESS",
  error: "ERROR",
  offline: "OFFLINE",
};

export function JarvisCore({ state = "idle" }: { state?: CoreState }) {
  return (
    <div className="jarvis-core" data-state={state} role="status" aria-label={`Jarvis: ${STATE_LABEL[state]}`}>
      <svg viewBox="0 0 200 200" className="jarvis-core-svg" aria-hidden="true">
        <circle className="core-ring core-ring-outer" cx="100" cy="100" r="88" />
        <circle className="core-ring core-ring-mid" cx="100" cy="100" r="66" />
        <circle className="core-ring core-ring-inner" cx="100" cy="100" r="44" />
        <circle className="core-nucleus" cx="100" cy="100" r="18" />
      </svg>
      <div className="jarvis-core-label">{STATE_LABEL[state]}</div>
    </div>
  );
}
