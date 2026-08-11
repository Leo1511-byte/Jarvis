import { POPOUT_VIEWS } from "../lib/popoutViews";
import { openViewWindow } from "../lib/windowManager";
import { useInTauri } from "../hooks/useInTauri";

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
 *
 * Milestone 32: items backed by a real view (see lib/popoutViews.ts) get
 * a second "pop out" button that opens that view in its own Tauri
 * window. Only rendered inside Tauri (useInTauri) -- there's no window
 * manager to talk to in a plain browser preview, and a button that does
 * nothing there would be dishonest the same way the rest of this app
 * avoids "renders but isn't connected" UI.
 */
export function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (item: string) => void;
}) {
  const inTauri = useInTauri();

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">JARVIS</div>
      <ul className="sidebar-list">
        {NAV_ITEMS.map((item) => {
          const slug = POPOUT_VIEWS[item];
          return (
            <li key={item} className="sidebar-row">
              <button
                className={"sidebar-item" + (item === active ? " active" : "")}
                onClick={() => onSelect(item)}
              >
                {item}
              </button>
              {inTauri && slug && (
                <button
                  className="sidebar-popout"
                  title={`Open ${item} in its own window`}
                  aria-label={`Open ${item} in its own window`}
                  onClick={() => {
                    openViewWindow(slug, item).catch(() => {});
                  }}
                >
                  ⧉
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
