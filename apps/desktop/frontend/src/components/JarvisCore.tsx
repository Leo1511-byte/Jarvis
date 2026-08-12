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

// Milestone 34: 24 fixed radial tick marks just outside the outer ring --
// a technical-instrument detail from PROJECT_OBJECTIVE.md's visual
// references. Deliberately static (no rotation, no per-state animation)
// so they read as the instrument's fixed bezel, contrasting with the
// rings that actually spin/pulse to show state -- ticks are decoration
// around a real status indicator, not another thing pretending to move.
const TICK_COUNT = 24;
const TICK_ANGLES = Array.from({ length: TICK_COUNT }, (_, i) => (i * 360) / TICK_COUNT);

function tickLine(angleDeg: number, key: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const rInner = 92;
  const rOuter = angleDeg % 90 === 0 ? 100 : 97; // longer ticks at the 4 cardinal points
  const x1 = 100 + rInner * Math.cos(rad);
  const y1 = 100 + rInner * Math.sin(rad);
  const x2 = 100 + rOuter * Math.cos(rad);
  const y2 = 100 + rOuter * Math.sin(rad);
  return <line key={key} className="core-tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
}

export function JarvisCore({ state = "idle" }: { state?: CoreState }) {
  return (
    <div className="jarvis-core" data-state={state} role="status" aria-label={`Jarvis: ${STATE_LABEL[state]}`}>
      <svg viewBox="0 0 200 200" className="jarvis-core-svg" aria-hidden="true">
        <defs>
          <linearGradient id="core-beam-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="core-ticks">{TICK_ANGLES.map((a, i) => tickLine(a, i))}</g>
        {/* Vertical light beam through the core, per the Dashboard reference
            image -- kept inside the viewBox (doesn't extend past the ticks)
            rather than literally reproducing the reference's much taller
            beam, so it doesn't need a layout change to the space around it. */}
        <line className="core-beam" x1="100" y1="100" x2="100" y2="4" stroke="url(#core-beam-gradient)" />
        <circle className="core-ring core-ring-outer" cx="100" cy="100" r="88" />
        <circle className="core-ring core-ring-mid" cx="100" cy="100" r="66" />
        <circle className="core-ring core-ring-inner" cx="100" cy="100" r="44" />
        <circle className="core-nucleus" cx="100" cy="100" r="18" />
      </svg>
      <div className="jarvis-core-label">{STATE_LABEL[state]}</div>
    </div>
  );
}
