import { useState } from "react";
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
