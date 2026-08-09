import { useEffect, useState, type FormEvent } from "react";
import { getStore, type Task, type TaskStatus } from "../lib/store";

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done", "cancelled"];

function nextStatus(current: TaskStatus): TaskStatus {
  // Simple linear cycle for the "advance" click -- not a real workflow
  // engine, just enough to move a task from todo through done by hand.
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return current;
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const store = getStore();

  async function refresh() {
    setLoading(true);
    setTasks(await store.listTasks());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await store.createTask({ title: trimmed });
    setTitle("");
    await refresh();
  }

  async function advance(task: Task) {
    await store.updateTask(task.id, { status: nextStatus(task.status) });
    await refresh();
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  })).filter((g) => g.items.length > 0 || g.status === "todo");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Tasks</h2>
        <p className="empty-state">
          Not scoped to a project yet — Milestone 8 is deliberately minimal (spec principle #20:
          don't build dozens of unfinished features at once). Per-project task views come once
          the Project detail page exists.
        </p>
      </div>

      <form onSubmit={handleCreate} className="command-bar" style={{ maxWidth: 400 }}>
        <input
          className="command-bar-input"
          placeholder="New task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="jc-btn-inline">
          Add
        </button>
      </form>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="empty-state">No tasks yet. Add one above.</p>
      ) : (
        grouped.map((g) => (
          <div key={g.status}>
            <h3 className="panel-title">{g.status.replace("_", " ").toUpperCase()}</h3>
            {g.items.length === 0 ? (
              <p className="empty-state">Nothing here.</p>
            ) : (
              <ul className="status-list">
                {g.items.map((t) => (
                  <li key={t.id} className="status-row">
                    <span>{t.title}</span>
                    {t.status !== "done" && t.status !== "cancelled" && (
                      <button className="jc-btn-inline" onClick={() => advance(t)}>
                        Advance
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}
