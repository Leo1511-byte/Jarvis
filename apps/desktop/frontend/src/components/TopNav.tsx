import { POPOUT_VIEWS } from "../lib/popoutViews";
import { openViewWindow } from "../lib/windowManager";
import { useInTauri } from "../hooks/useInTauri";

/**
 * Milestone 35 — replaces Sidebar.tsx's 13-item left nav (most entries
 * were dead placeholders) with a compact top bar, per PROJECT_OBJECTIVE.md's
 * three visual references. Every item here is real -- backed by an actual
 * component in App.tsx's renderActive -- except System, which is included
 * because all three references confirm it as a primary destination and
 * Milestone 36 is queued to build its real content; until then it shows
 * an honest "not built yet" (NotBuiltView), the same pattern this app
 * already uses everywhere else rather than hiding the gap.
 *
 * Deliberately a flat list of 9, not grouped behind a "more" menu --
 * nothing lost from the pre-migration Sidebar's real views. If this ever
 * feels crowded in practice, grouping is a small follow-up, not a
 * rebuild.
 */
const NAV_ITEMS = [
  "Dashboard",
  "Chat",
  "Skills",
  "Memory",
  "Connections",
  "Projects",
  "Tasks",
  "Activity",
  "System",
] as const;

export function TopNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (item: string) => void;
}) {
  const inTauri = useInTauri();

  return (
    <nav className="top-nav" aria-label="Main navigation">
      <div className="top-nav-brand">JARVIS</div>
      <ul className="top-nav-list">
        {NAV_ITEMS.map((item) => {
          const slug = POPOUT_VIEWS[item];
          return (
            <li key={item} className="top-nav-row">
              <button
                className={"top-nav-item" + (item === active ? " active" : "")}
                onClick={() => onSelect(item)}
              >
                {item}
              </button>
              {inTauri && slug && (
                <button
                  className="top-nav-popout"
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
