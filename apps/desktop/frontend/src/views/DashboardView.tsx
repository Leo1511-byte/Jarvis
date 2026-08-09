import { JarvisCore, type CoreState } from "../components/JarvisCore";
import { StatusPanel } from "../components/StatusPanel";
import { VoiceSettings } from "../components/VoiceSettings";

const DEMO_STATES: CoreState[] = ["idle", "wake-word-active", "listening", "processing", "success"];

export interface LogEntry {
  you: string;
  jarvis: string;
}

export function DashboardView({
  coreState,
  onDemoState,
  log,
}: {
  coreState: CoreState;
  onDemoState: (s: CoreState) => void;
  log: LogEntry[];
}) {
  return (
    <>
      <div className="core-row">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <JarvisCore state={coreState} />
          <select
            value={coreState}
            onChange={(e) => onDemoState(e.target.value as CoreState)}
            style={{
              background: "var(--bg-panel)",
              color: "var(--text-dim)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "4px 8px",
            }}
          >
            {DEMO_STATES.map((s) => (
              <option key={s} value={s}>
                demo: {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <h3 className="panel-title">Active Project</h3>
          <p className="empty-state">No active project selected — see the Projects tab.</p>
        </div>
        <div className="panel">
          <h3 className="panel-title">Command Log</h3>
          {log.length === 0 ? (
            <p className="empty-state">Try the command bar above — "help", "status", or "switch to neon void".</p>
          ) : (
            <ul className="status-list">
              {log.map((entry, i) => (
                <li key={i} className="status-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ color: "var(--text-dim)" }}>You: {entry.you}</span>
                  <span>Jarvis: {entry.jarvis}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <StatusPanel />
        <VoiceSettings />
      </div>
    </>
  );
}
