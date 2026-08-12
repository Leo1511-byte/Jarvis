/**
 * Milestone 32 (multi-window foundation): real views (backed by an actual
 * component in App.tsx's renderActive) that support popping out into
 * their own Tauri window. Deliberately excludes still-placeholder
 * sections (Research, Automations, Notifications) -- popping one of
 * those out would be a window that shows "not built yet" and nothing
 * else, the exact "renders but isn't connected" mistake this project's
 * own discipline rules out (see ARCHITECTURE.md).
 *
 * Single source of truth for the nav-name <-> URL-slug mapping:
 * TopNav.tsx (Milestone 35, replaced Sidebar.tsx) uses POPOUT_VIEWS to
 * decide which items get a pop-out button and what slug to open; App.tsx
 * uses SLUG_TO_VIEW to resolve a standalone window's `?view=<slug>` back
 * to the nav name its existing renderActive() switch already knows how
 * to render.
 *
 * Milestone 35 renamed two entries to match what they actually render --
 * "Agents" was always SkillsView, "Integrations" was always
 * ConnectionsView. Slugs changed too (agents->skills,
 * integrations->connections); nothing else depended on the old slugs
 * (this app has never shipped, so there's no compatibility need to
 * preserve them).
 *
 * Milestone 36 added System now that it renders real content
 * (SystemView) instead of NotBuiltView.
 */
export const POPOUT_VIEWS: Record<string, string> = {
  Dashboard: "dashboard",
  Chat: "chat",
  Skills: "skills",
  Memory: "memory",
  Connections: "connections",
  Projects: "projects",
  Tasks: "tasks",
  Activity: "activity",
  System: "system",
};

export const SLUG_TO_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(POPOUT_VIEWS).map(([view, slug]) => [slug, view])
);
