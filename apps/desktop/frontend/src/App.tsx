import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { type CoreState } from "./components/JarvisCore";
import { CommandBar } from "./components/CommandBar";
import { Sidebar } from "./components/Sidebar";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { parseCommand, executeCommand } from "./commandEngine";
import { DashboardView, type LogEntry } from "./views/DashboardView";
import { ProjectsView } from "./views/ProjectsView";
import { TasksView } from "./views/TasksView";
import { NotBuiltView } from "./views/NotBuiltView";

interface OrchestratorResponse {
  result: string;
  session_id: string;
  cost_usd: number;
}

// Milestone 10: the desktop app's one real connection to the local
// orchestrator (the `claude` CLI, shelled out to from the Rust backend --
// see apps/desktop/backend/src/orchestrator.rs). Calls can take a while
// (a real Claude Code turn, not a lookup), so callers should show a
// working state rather than assume this resolves quickly.
async function runOrchestrator(prompt: string): Promise<string> {
  const response = await invoke<OrchestratorResponse>("run_orchestrator", { prompt });
  return response.result;
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState("Dashboard");
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [log, setLog] = useState<LogEntry[]>([]);

  async function handleCommand(text: string) {
    setCoreState("processing");
    const command = parseCommand(text);
    const response = await executeCommand(command, { setTheme, runOrchestrator });
    setLog((prev) => [...prev, { you: text, jarvis: response }].slice(-6));
    setCoreState(command.kind === "unknown" ? "error" : "success");
    window.setTimeout(() => setCoreState("idle"), 1200);
  }

  function renderActive() {
    switch (active) {
      case "Dashboard":
        return <DashboardView coreState={coreState} onDemoState={setCoreState} log={log} />;
      case "Projects":
        return <ProjectsView />;
      case "Tasks":
        return <TasksView />;
      default:
        return <NotBuiltView section={active} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onSelect={setActive} />

      <main className="main">
        <header className="main-header">
          <CommandBar onSubmit={handleCommand} />
          <ThemeSwitcher theme={theme} onChange={setTheme} />
        </header>

        {renderActive()}
      </main>
    </div>
  );
}
