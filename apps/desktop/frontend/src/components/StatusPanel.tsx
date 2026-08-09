type Status = "connected" | "disconnected" | "not-wired";

const SYSTEMS: Array<{ name: string; status: Status }> = [
  { name: "Claude (local orchestrator)", status: "not-wired" },
  { name: "Obsidian", status: "not-wired" },
  { name: "Supabase", status: "not-wired" },
  { name: "Voice", status: "not-wired" },
  { name: "GitHub", status: "not-wired" },
];

const LABEL: Record<Status, string> = {
  connected: "CONNECTED",
  disconnected: "DISCONNECTED",
  "not-wired": "NOT WIRED YET",
};

/**
 * Deliberately shows "NOT WIRED YET" instead of fake green checkmarks
 * (spec §5, §96: never fake connection status). Each row goes live as
 * its integration milestone actually ships a real health check —
 * Obsidian/Supabase/GitHub connections get built starting M6/M7/M12.
 */
export function StatusPanel() {
  return (
    <div className="panel">
      <h3 className="panel-title">System Status</h3>
      <ul className="status-list">
        {SYSTEMS.map((s) => (
          <li key={s.name} className="status-row">
            <span>{s.name}</span>
            <span className={"status-badge status-" + s.status}>{LABEL[s.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
