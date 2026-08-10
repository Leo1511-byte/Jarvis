import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { useVoiceSettings } from "./hooks/useVoiceSettings";
import { useVoiceListener } from "./hooks/useVoiceListener";
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

interface BackgroundJob {
  job_id: string;
  session_id: string;
}

type BackgroundState = "running" | "done" | "failed" | "not_found";

const BACKGROUND_POLL_MS = 5000;

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
  const { settings: voiceSettings, update: updateVoiceSettings } = useVoiceSettings();
  const [active, setActive] = useState("Dashboard");
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [log, setLog] = useState<LogEntry[]>([]);

  // Milestone 10, background-mode slice: polls `poll_orchestrator_background`
  // every BACKGROUND_POLL_MS until the job is done (or fails/disappears),
  // then fetches the real result and drops it into the Command Log --
  // continue-project's immediate response is just "started", this is what
  // delivers the actual answer once the workflow finishes.
  function pollBackgroundJob(jobId: string, sessionId: string) {
    const interval = window.setInterval(async () => {
      let state: BackgroundState;
      try {
        state = await invoke<BackgroundState>("poll_orchestrator_background", { jobId });
      } catch {
        window.clearInterval(interval);
        return;
      }
      if (state === "running") return;

      window.clearInterval(interval);
      if (state === "done") {
        try {
          const result = await invoke<OrchestratorResponse>("fetch_orchestrator_background_result", {
            sessionId,
          });
          setLog((prev) =>
            [...prev, { you: `(background job ${jobId} finished)`, jarvis: result.result }].slice(-6)
          );
          setCoreState("success");
        } catch (e) {
          setLog((prev) =>
            [
              ...prev,
              {
                you: `(background job ${jobId} finished)`,
                jarvis: `Finished, but couldn't fetch the result: ${e instanceof Error ? e.message : String(e)}`,
              },
            ].slice(-6)
          );
          setCoreState("error");
        }
      } else {
        setLog((prev) =>
          [
            ...prev,
            {
              you: `(background job ${jobId})`,
              jarvis: state === "failed" ? "The background job failed." : "Lost track of the background job.",
            },
          ].slice(-6)
        );
        setCoreState("error");
      }
      window.setTimeout(() => setCoreState("idle"), 1200);
      invoke("stop_orchestrator_background", { jobId }).catch(() => {});
    }, BACKGROUND_POLL_MS);
  }

  async function runOrchestratorBackground(prompt: string): Promise<{ jobId: string; sessionId: string }> {
    const job = await invoke<BackgroundJob>("run_orchestrator_background", { prompt });
    pollBackgroundJob(job.job_id, job.session_id);
    return { jobId: job.job_id, sessionId: job.session_id };
  }

  async function handleCommand(text: string, speak = false) {
    setCoreState("processing");
    const command = parseCommand(text);
    const response = await executeCommand(command, {
      setTheme,
      runOrchestrator,
      runOrchestratorBackground,
    });
    setLog((prev) => [...prev, { you: text, jarvis: response }].slice(-6));
    setCoreState(command.kind === "unknown" ? "error" : "success");
    if (speak) {
      setCoreState("speaking");
      invoke("queue_speech", { text: response }).catch(() => {});
    }
    window.setTimeout(() => setCoreState("idle"), 1200);
  }

  // Milestone 9 wired in: the wake-word listener + transcriber (Python,
  // spawned by voice.rs) feeds its transcript into the exact same
  // parseCommand/executeCommand path the typed command bar uses -- no
  // separate voice-command logic, per spec §32. Only active while both
  // "Microphone enabled" and "Wake word" are on in Voice settings.
  useVoiceListener(voiceSettings.micEnabled && voiceSettings.wakeWordEnabled, {
    onWake: () => setCoreState("listening"),
    onTranscript: (text) => {
      handleCommand(text, true);
    },
    onError: (message) => {
      // Voice start/runtime failures used to vanish silently (no process,
      // no log line, nothing on screen -- hit live 2026-08-10). Now they
      // land in the Command Log like everything else, so a failure is
      // readable without opening devtools.
      setLog((prev) => [...prev, { you: "(voice)", jarvis: message }].slice(-6));
      setCoreState("error");
      window.setTimeout(() => setCoreState("idle"), 1200);
    },
    onStatus: (message) => {
      // Rust-side crash-recovery notifications (voice.rs's monitor
      // threads): "crashed, restarting", "reconnected", or "gave up".
      // Logged like any other voice event -- not forced into the error
      // visual state, since a successful reconnect isn't bad news.
      setLog((prev) => [...prev, { you: "(voice)", jarvis: message }].slice(-6));
    },
  });

  function renderActive() {
    switch (active) {
      case "Dashboard":
        return (
          <DashboardView
            coreState={coreState}
            onDemoState={setCoreState}
            log={log}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={updateVoiceSettings}
          />
        );
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
