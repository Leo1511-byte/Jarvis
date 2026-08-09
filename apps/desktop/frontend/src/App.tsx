import { useState } from "react";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { JarvisCore, type CoreState } from "./components/JarvisCore";
import { CommandBar } from "./components/CommandBar";
import { Sidebar } from "./components/Sidebar";
import { StatusPanel } from "./components/StatusPanel";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { parseCommand, executeCommand } from "./commandEngine";

// Manual override for exploring the core's states — the command engine
// below also drives coreState for real when a command actually runs.
const DEMO_STATES: CoreState[] = ["idle", "wake-word-active", "listening", "processing", "success"];

interface LogEntry {
  you: string;
  jarvis: string;
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState("Dashboard");
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [log, setLog] = useState<LogEntry[]>([]);

  function handleCommand(text: string) {
    setCoreState("processing");
    const command = parseCommand(text);
    const response = executeCommand(command, { setTheme });
    setLog((prev) => [...prev, { you: text, jarvis: response }].slice(-6));
    setCoreState(command.kind === "unknown" ? "error" : "success");
    window.setTimeout(() => setCoreState("idle"), 1200);
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />

      <main className="main">
        <header className="main-header">
          <CommandBar onSubmit={handleCommand} />
          <ThemeSwitcher theme={theme} onChange={setTheme} />
        </header>

        <div className="core-row">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <JarvisCore state={coreState} />
            <select
              value={coreState}
              onChange={(e) => setCoreState(e.target.value as CoreState)}
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
            <p className="empty-state">No projects yet — Milestone 8 builds the project system.</p>
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
        </div>
      </main>
    </div>
  );
}
