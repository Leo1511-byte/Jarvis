import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { useVoiceSettings } from "./hooks/useVoiceSettings";
import { useVoiceListener } from "./hooks/useVoiceListener";
import { useActiveProject } from "./hooks/useActiveProject";
import { useCurrentConversation } from "./hooks/useCurrentConversation";
import { type CoreState } from "./components/JarvisCore";
import { CommandBar } from "./components/CommandBar";
import { Sidebar } from "./components/Sidebar";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { parseCommand, executeCommand } from "./commandEngine";
import { getStore, type Conversation, type Message, type Project } from "./lib/store";
import { DashboardView, type LogEntry } from "./views/DashboardView";
import { ProjectsView } from "./views/ProjectsView";
import { TasksView } from "./views/TasksView";
import { MemoryView } from "./views/MemoryView";
import { ChatView } from "./views/ChatView";
import { ConnectionsView } from "./views/ConnectionsView";
import { SkillsView } from "./views/SkillsView";
import { NotBuiltView } from "./views/NotBuiltView";

// Synchronous orchestrator commands (research/check-calendar/check-email/
// check-github/ask) measured 12-44s live via scripts/benchmark_orchestrator.sh
// (2026-08-11), with zero feedback beyond the JarvisCore animation. For a
// voice interaction especially, tens of seconds of silence reads as broken,
// not working -- handleCommand below surfaces an interim status after this
// delay if the real response hasn't landed yet. continue-project's
// background-mode path resolves in ~1s (its own "started as a background
// job" text is already the fast-feedback path), so this timer firing for it
// would be rare and harmless, not double feedback.
const THINKING_DELAY_MS = 6000;
const ORCHESTRATOR_ROUTED_KINDS = new Set([
  "research",
  "continue-project",
  "check-calendar",
  "check-email",
  "check-github",
  "ask",
]);

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
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  // Milestone 21: resolves to a real, persisted conversation once the store
  // (local or Supabase) has created/loaded one -- null briefly on first
  // mount and whenever persistence itself fails, which handleCommand below
  // treats as "don't persist this exchange" rather than blocking on it.
  const { conversation: currentConversation, selectConversation } = useCurrentConversation();
  const [active, setActive] = useState("Dashboard");
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [thinking, setThinking] = useState<string | null>(null);
  // Milestone 22 (Chat view): full persisted history for currentConversation
  // (unlike `log` above, not capped at 6) and the list of every conversation
  // for the switcher. Both loaded lazily -- conversations only once the Chat
  // tab is actually opened, since nothing else in the app needs the list.
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Resolves activeProjectId (just an id, from localStorage) down to the
  // real project object -- both DashboardView's display and handleCommand's
  // research-prompt context need the current name, and re-fetching here
  // whenever the id changes means a rename or delete elsewhere is picked up
  // without DashboardView/ProjectsView needing to coordinate directly.
  useEffect(() => {
    let cancelled = false;
    if (!activeProjectId) {
      setActiveProject(null);
      return;
    }
    getStore()
      .listProjects()
      .then((projects) => {
        if (!cancelled) {
          setActiveProject(projects.find((p) => p.id === activeProjectId) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setActiveProject(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  // Milestone 22: loads full history whenever the current conversation
  // changes (including on first resolve and whenever the Chat view's
  // switcher picks a different one via selectConversation) -- this is what
  // makes ChatView show more than the Dashboard's rolling last-6 log.
  useEffect(() => {
    let cancelled = false;
    if (!currentConversation) {
      setMessages([]);
      return;
    }
    getStore()
      .listMessages(currentConversation.id)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentConversation]);

  // Milestone 22: the conversation switcher's list -- only fetched once the
  // Chat tab is opened (not on every render) rather than kept live-synced
  // at all times, since nothing else in the app reads it.
  useEffect(() => {
    if (active !== "Chat") return;
    let cancelled = false;
    getStore()
      .listConversations()
      .then((cs) => {
        if (!cancelled) setConversations(cs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  async function handleNewConversation() {
    try {
      const created = await getStore().createConversation();
      selectConversation(created);
      setConversations((prev) => [created, ...prev]);
    } catch {
      // Best-effort, same as the rest of Chat persistence -- a failed
      // create just means the button didn't do anything, not a crash.
    }
  }

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

    let thinkingTimer: number | undefined;
    if (ORCHESTRATOR_ROUTED_KINDS.has(command.kind)) {
      thinkingTimer = window.setTimeout(() => {
        setThinking(
          "Still working on that — some commands take up to a minute. No news is good news."
        );
      }, THINKING_DELAY_MS);
    }

    let response: string;
    try {
      response = await executeCommand(command, {
        setTheme,
        runOrchestrator,
        runOrchestratorBackground,
        activeProject: activeProject ? { name: activeProject.name } : null,
      });
    } finally {
      if (thinkingTimer !== undefined) window.clearTimeout(thinkingTimer);
      setThinking(null);
    }

    setLog((prev) => [...prev, { you: text, jarvis: response }].slice(-6));
    setCoreState(command.kind === "unknown" ? "error" : "success");

    // Milestone 21/22: persist the exchange alongside the existing in-memory
    // Command Log (unchanged above), and append to `messages` once each
    // write resolves so the Chat view reflects it without a full refetch.
    // Fire-and-forget: persistence failing (store not ready yet, offline,
    // etc.) shouldn't block or error out a command that already succeeded.
    if (currentConversation) {
      const store = getStore();
      store
        .createMessage({ conversationId: currentConversation.id, role: "user", content: text })
        .then((msg) => setMessages((prev) => [...prev, msg]))
        .catch(() => {});
      store
        .createMessage({ conversationId: currentConversation.id, role: "jarvis", content: response })
        .then((msg) => setMessages((prev) => [...prev, msg]))
        .catch(() => {});
    }

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
            activeProject={activeProject}
            thinking={thinking}
          />
        );
      case "Projects":
        return (
          <ProjectsView activeProjectId={activeProjectId} onSetActiveProjectId={setActiveProjectId} />
        );
      case "Tasks":
        return <TasksView />;
      case "Memory":
        return <MemoryView runOrchestrator={runOrchestrator} />;
      case "Chat":
        return (
          <ChatView
            conversation={currentConversation}
            conversations={conversations}
            messages={messages}
            onSelectConversation={selectConversation}
            onNewConversation={handleNewConversation}
            onSubmit={(text) => {
              handleCommand(text);
            }}
          />
        );
      case "Integrations":
        return <ConnectionsView />;
      case "Agents":
        return (
          <SkillsView
            onRun={(text) => {
              handleCommand(text);
            }}
          />
        );
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
