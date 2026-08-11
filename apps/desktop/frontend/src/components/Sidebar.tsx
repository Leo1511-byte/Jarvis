const NAV_ITEMS = [
  "Dashboard",
  "Chat",
  "Projects",
  "Tasks",
  "Memory",
  "Research",
  "Agents",
  "Automations",
  "Integrations",
  "Activity",
  "Notifications",
  "System",
  "Settings",
] as const;

/**
 * Visual nav shell (spec §20) — no routing yet. Each item is a plain
 * button; wiring to real views happens as each area's milestone lands
 * (Projects/Tasks: M8, Chat: M22, Agents: M17, Integrations: M12+, etc.)
 * rather than all at once.
 */
export function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (item: string) => void;
}) {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">JARVIS</div>
      <ul className="sidebar-list">
        {NAV_ITEMS.map((item) => (
          <li key={item}>
            <button
              className={"sidebar-item" + (item === active ? " active" : "")}
              onClick={() => onSelect(item)}
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
