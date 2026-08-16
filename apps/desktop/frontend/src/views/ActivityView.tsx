import { useEffect, useState } from "react";
import { getStore, type ActivityEvent } from "../lib/store";

const LIMIT = 50;

/**
 * Milestone 26 — replaces the "Activity" placeholder. Reads
 * `activity_events`, the table 0001_init.sql created back at Milestone 7
 * but that had no store methods or UI reading/writing it until this
 * milestone -- every row here comes from a real Skill run (see
 * SKILL_COMMAND_KINDS in App.tsx), not sample data.
 */
export function ActivityView() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getStore()
      .listActivityEvents(LIMIT)
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Activity</h2>
        <p className="empty-state">
          Every Skill run, most recent first — the traceability record docs/SECURITY.md's Level 2
          rule calls for. Not a chat log (see Chat) and not a note index (see Memory), just what
          ran, when.
        </p>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : events.length === 0 ? (
        <p className="empty-state">
          Nothing logged yet — run a Skill (Skills tab, command bar, voice, or Chat) and it'll
          show up here.
        </p>
      ) : (
        <div className="panel">
          <ul className="status-list">
            {events.map((e) => (
              <li key={e.id} className="status-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <span>{e.summary}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                  {new Date(e.createdAt).toLocaleString()}
                  {e.skillId ? ` · ${e.skillId}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
