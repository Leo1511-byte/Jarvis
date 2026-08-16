import { useEffect, useState, type FormEvent } from "react";
import { getStore, type Project } from "../lib/store";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useApproval } from "../hooks/useApproval";
import { ApprovalDialog } from "../components/ApprovalDialog";

/**
 * Real CRUD against whatever store getStore() returns -- localStorage
 * today, Supabase once it's provisioned (store/index.ts switches
 * automatically). No mock/sample data: an empty list means you have
 * no projects yet, genuinely.
 */
export function ProjectsView({
  activeProjectId,
  onSetActiveProjectId,
}: {
  activeProjectId: string | null;
  onSetActiveProjectId: (id: string | null) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const store = getStore();
  const { pending, requestApproval, respond } = useApproval();

  async function refresh() {
    setLoading(true);
    setProjects(await store.listProjects());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await store.createProject({ name: trimmed });
    setName("");
    await refresh();
  }

  async function toggleStatus(p: Project) {
    const next = p.status === "active" ? "paused" : "active";
    await store.updateProject(p.id, { status: next });
    await refresh();
  }

  async function handleDelete(p: Project) {
    const approved = await requestApproval({
      action: `Delete project "${p.name}"`,
      context: `Created ${new Date(p.createdAt).toLocaleDateString()} · status: ${p.status}`,
      reason: "You clicked Delete on this project in the Projects view.",
      risk:
        "Permanently removes this project and cascades to delete every task linked to it. This cannot be undone from within JARVIS.",
    });
    if (!approved) return;
    setDeletingId(p.id);
    try {
      await store.deleteProject(p.id);
      // A deleted project can't stay "the active project" -- clear the
      // selection rather than leaving useActiveProject pointing at a
      // dangling id (DashboardView/commandEngine's research context would
      // otherwise silently resolve to nothing until the user noticed).
      if (activeProjectId === p.id) {
        onSetActiveProjectId(null);
      }
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Projects</h2>
        <p className="empty-state">
          {isSupabaseConfigured()
            ? "Backed by Supabase."
            : "Backed by local storage only — Supabase isn't configured yet (see M7 in project/ROADMAP.md). Data stays on this machine."}
        </p>
      </div>

      <form onSubmit={handleCreate} className="command-bar" style={{ maxWidth: 400 }}>
        <input
          className="command-bar-input"
          placeholder="New project name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="jc-btn-inline">
          Add
        </button>
      </form>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="empty-state">No projects yet. Add one above.</p>
      ) : (
        <div className="panel-grid">
          {projects.map((p) => {
            const isActive = activeProjectId === p.id;
            return (
              <div
                key={p.id}
                className="panel"
                style={isActive ? { borderColor: "var(--accent)" } : undefined}
              >
                <h3 className="panel-title">{p.name}</h3>
                <div className="status-row">
                  <span>Status</span>
                  <button
                    className={"status-badge status-" + (p.status === "active" ? "connected" : "not-wired")}
                    onClick={() => toggleStatus(p)}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {p.status.toUpperCase()}
                  </button>
                </div>
                <div className="status-row">
                  <span>Created</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="status-row">
                  <span>JARVIS focus</span>
                  <button
                    type="button"
                    className={"status-badge status-" + (isActive ? "connected" : "not-wired")}
                    style={{ cursor: isActive ? "default" : "pointer", border: "none" }}
                    disabled={isActive}
                    onClick={() => onSetActiveProjectId(p.id)}
                  >
                    {isActive ? "ACTIVE" : "SET ACTIVE"}
                  </button>
                </div>
                <div className="status-row">
                  <button
                    type="button"
                    className="jc-btn-inline"
                    style={{ borderColor: "var(--error)", color: "var(--error)" }}
                    disabled={deletingId === p.id}
                    onClick={() => handleDelete(p)}
                  >
                    {deletingId === p.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending && <ApprovalDialog request={pending} onRespond={respond} />}
    </div>
  );
}
