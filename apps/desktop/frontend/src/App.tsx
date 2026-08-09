import { useState } from "react";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { JarvisCore, type CoreState } from "./components/JarvisCore";
import { CommandBar } from "./components/CommandBar";
import { Sidebar } from "./components/Sidebar";
import { StatusPanel } from "./components/StatusPanel";
import { ThemeSwitcher } from "./components/ThemeSwitcher";

// Cycle through core states so the animations are visible without a
// real event source yet (Milestone 5 replaces this with actual state).
const DEMO_STATES: CoreState[] = ["idle", "wake-word-active", "listening", "processing", "success"];

export default function App() {
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState("Dashboard");
  const [coreState, setCoreState] = useState<CoreState>("idle");

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />

      <main className="main">
        <header className="main-header">
          <CommandBar />
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
            <h3 className="panel-title">Today</h3>
            <p className="empty-state">No tasks or calendar data wired yet — Milestone 8/14.</p>
          </div>
          <StatusPanel />
        </div>
      </main>
    </div>
  );
}
