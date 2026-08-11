/**
 * Milestone 23 (Connections registry) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md.
 * The six connections already real in this app (documented in MCP_SETUP.md):
 * Calendar/Gmail (MCP, verified live), GitHub (gh CLI, verified live),
 * Obsidian (direct filesystem access from `claude`, verified live), Web
 * (the orchestrator's research prompt), Supabase (REST + anon key,
 * verified live). Fixed, known-in-advance metadata -- not something the UI
 * creates or edits -- so it's defined once here and mirrored by hand in
 * `packages/database/migrations/0003_connections.sql`'s seed inserts,
 * rather than either place being the sole source of truth.
 *
 * Capability strings and read_only flags are what Milestone 24's Skills
 * will reference via `skill_connections` to enforce least-privilege --
 * see the plan doc's SECURITY CONSIDERATIONS section. No credentials or
 * auth state live here or in the DB table this seeds; that stays exactly
 * where it already is (OS keyring, .claude/settings.local.json, .env.local).
 */
export interface BuiltinConnection {
  id: string;
  capabilities: { capability: string; readOnly: boolean }[];
}

export const BUILTIN_CONNECTIONS: BuiltinConnection[] = [
  {
    id: "calendar",
    capabilities: [{ capability: "read-events", readOnly: true }],
  },
  {
    id: "gmail",
    capabilities: [{ capability: "read-email", readOnly: true }],
  },
  {
    id: "github",
    capabilities: [{ capability: "read-prs-issues", readOnly: true }],
  },
  {
    id: "obsidian",
    capabilities: [
      { capability: "read-vault", readOnly: true },
      { capability: "write-notes", readOnly: false },
    ],
  },
  {
    id: "web",
    capabilities: [{ capability: "search-and-summarize", readOnly: true }],
  },
  {
    id: "supabase",
    capabilities: [
      { capability: "read-structured-state", readOnly: true },
      { capability: "write-structured-state", readOnly: false },
    ],
  },
];
