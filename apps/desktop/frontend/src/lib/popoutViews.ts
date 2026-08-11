/**
 * Milestone 32 (multi-window foundation): real views (backed by an actual
 * component in App.tsx's renderActive) that support popping out into
 * their own Tauri window. Deliberately excludes Sidebar's placeholder-only
 * sections (Research, Automations, Notifications, System, Settings) --
 * popping one of those out would be a window that shows "not built yet"
 * and nothing else, the exact "renders but isn't connected" mistake this
 * project's own discipline rules out (see ARCHITECTURE.md).
 *
 * Single source of truth for the Sidebar-name <-> URL-slug mapping:
 * Sidebar.tsx uses POPOUT_VIEWS to decide which items get a pop-out
 * button and what slug to open; App.tsx uses SLUG_TO_VIEW to resolve a
 * standalone window's `?view=<slug>` back to the Sidebar name its
 * existing renderActive() switch already knows how to render.
 */
export const POPOUT_VIEWS: Record<string, string> = {
  Dashboard: "dashboard",
  Chat: "chat",
  Projects: "projects",
  Tasks: "tasks",
  Memory: "memory",
  Agents: "agents",
  Integrations: "integrations",
  Activity: "activity",
};

export const SLUG_TO_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(POPOUT_VIEWS).map(([view, slug]) => [slug, view])
);
