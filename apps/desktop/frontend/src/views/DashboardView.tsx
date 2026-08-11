import { JarvisCore, type CoreState } from "../components/JarvisCore";
import { StatusPanel } from "../components/StatusPanel";
import { VoiceSettings } from "../components/VoiceSettings";
import type { VoiceSettings as VoiceSettingsData } from "../hooks/useVoiceSettings";
import type { Project } from "../lib/store";

const DEMO_STATES: CoreState[] = ["idle", "wake-word-active", "listening", "processing", "success"];

export interface LogEntry {
  you: string;
  jarvis: string;
}

export function DashboardView({
  coreState,
  onDemoState,
  log,
  voiceSettings,
  onUpdateVoiceSettings,
  activeProject,
  thinking,
}: {
  coreState: CoreState;
  onDemoState: (s: CoreState) => void;
  log: LogEntry[];
  voiceSettings: VoiceSettingsData;
  onUpdateVoiceSettings: (patch: Partial<VoiceSettingsData>) => void;
  /** Resolved by App.tsx from useActiveProject's id -- null covers both
   * "nothing selected" and "selected id no longer exists" identically, so
   * this panel never has to guess which case it's in. */
  activeProject: Project | null;
  /** Interim status text from App.tsx's handleCommand while a slow
   * orchestrator-routed command is still running (see THINKING_DELAY_MS)
   * -- null the rest of the time. Shown above the Command Log rather than
   * added as a fake log entry, since it isn't a real exchange yet. */
  thinking: string | null;
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
          {activeProject ? (
            <>
              <div className="status-row">
                <span>{activeProject.name}</span>
                <span className={"status-badge status-" + (activeProject.status === "active" ? "connected" : "not-wired")}>
                  {activeProject.status.toUpperCase()}
                </span>
              </div>
              <p className="empty-state" style={{ marginTop: "var(--space-2)" }}>
                Commands like "research &lt;topic&gt;" will link findings back to this project.
                Change it in the Projects tab.
              </p>
            </>
          ) : (
            <p className="empty-state">No active project selected — see the Projects tab.</p>
          )}
        </div>
        <div className="panel">
          <h3 className="panel-title">Command Log</h3>
          {thinking && (
            <p className="empty-state" style={{ color: "var(--accent)" }}>
              {thinking}
            </p>
          )}
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
        <VoiceSettings settings={voiceSettings} update={onUpdateVoiceSettings} />
      </div>
    </>
  );
}
