import { useEffect, useState } from "react";
import { getStore, type Connection, type Skill } from "../lib/store";

const PERMISSION_LABEL: Record<number, string> = {
  1: "LEVEL 1 · READ",
  2: "LEVEL 2 · WRITES",
  3: "LEVEL 3 · SENSITIVE",
};

// Skills that need no extra input beyond the skill itself -- the exact
// phrase commandEngine.ts's parseCommand already matches for each, same
// as what a person would type or say. "research"/"continue-project" need
// a topic/project name, handled separately below via an inline input.
const CANONICAL_TRIGGER: Record<string, string> = {
  "check-calendar": "check my calendar",
  "check-email": "check my email",
  "check-github": "check my github",
  "check-memory": "check my memory",
};

/**
 * Milestone 25 — replaces the "Agents" placeholder (AGENT_SYSTEM.md
 * already frames the six commands this way: "specialists... a prompt
 * template, not a distinct agent process," which is exactly what a Skill
 * is here too). Lists Milestone 24's Skills registry and lets Leonardo
 * trigger one manually.
 *
 * No new orchestration: `onRun` is the same `text => handleCommand(text)`
 * wiring ChatView already uses. Running a Skill here sends the exact same
 * command text the command bar/voice/Chat would, so it goes through
 * `parseCommand`/`executeCommand` unchanged -- same permission level, same
 * prompt, same everything. This view is a UI convenience, not a second
 * execution path.
 */
export function SkillsView({ onRun }: { onRun: (text: string) => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection[]>>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const store = getStore();
      try {
        const list = await store.listSkills();
        if (cancelled) return;
        setSkills(list);
        const entries = await Promise.all(
          list.map(async (s) => [s.id, await store.listSkillConnections(s.id)] as const)
        );
        if (!cancelled) setConnections(Object.fromEntries(entries));
      } catch {
        if (!cancelled) {
          setSkills([]);
          setConnections({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function run(skill: Skill) {
    const canonical = CANONICAL_TRIGGER[skill.id];
    if (canonical) {
      onRun(canonical);
      return;
    }
    const draft = (drafts[skill.id] ?? "").trim();
    if (skill.id === "research") {
      if (!draft) return;
      onRun(`research ${draft}`);
    } else if (skill.id === "continue-project") {
      if (!draft) return;
      onRun(`continue project ${draft}`);
    } else if (skill.id === "self-upgrade") {
      // Milestone 39: focus is optional -- runs with or without a draft,
      // unlike research/continue-project which need one to mean anything.
      onRun(draft ? `upgrade yourself: ${draft}` : "upgrade yourself");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Skills</h2>
        <p className="empty-state">
          What JARVIS can be asked to do, and what each one is allowed to touch. Running one here
          sends the exact same command the command bar, voice, and Chat all use — no separate
          execution path.
        </p>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : skills.length === 0 ? (
        <p className="empty-state">
          No skills found — if Supabase is configured, run{" "}
          <code>packages/database/migrations/0004_skills.sql</code> in the SQL editor first
          (after <code>0003_connections.sql</code>).
        </p>
      ) : (
        <div className="panel-grid">
          {skills.map((s) => {
            const requiredInput = s.id === "research" || s.id === "continue-project";
            const optionalInput = s.id === "self-upgrade";
            const usedConnections = connections[s.id] ?? [];
            return (
              <div key={s.id} className="panel">
                <h3 className="panel-title">{s.name}</h3>
                <p className="empty-state">{s.description}</p>
                <div className="status-row">
                  <span>Permission</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: 1,
                      color: "var(--text-dim)",
                    }}
                  >
                    {PERMISSION_LABEL[s.permissionLevel]}
                  </span>
                </div>
                <div className="status-row">
                  <span>Uses</span>
                  <span style={{ color: "var(--text-dim)" }}>
                    {usedConnections.length > 0
                      ? usedConnections.map((c) => c.name).join(", ")
                      : "local filesystem/git (no registered Connection)"}
                  </span>
                </div>
                {requiredInput || optionalInput ? (
                  <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                    <input
                      className="command-bar-input"
                      style={{ flex: 1 }}
                      placeholder={
                        s.id === "research"
                          ? "topic…"
                          : s.id === "continue-project"
                            ? "project name…"
                            : "focus (optional)…"
                      }
                      value={drafts[s.id] ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    />
                    <button type="button" className="jc-btn-inline" onClick={() => run(s)}>
                      Run
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="jc-btn-inline"
                    style={{ marginTop: "var(--space-3)" }}
                    onClick={() => run(s)}
                  >
                    Run
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
