# Handoff: Memory index (Milestone 27) + pending migrations

Written by Cowork, 2026-08-11, for local Claude Code (or Leonardo directly for the migration
part). Cowork's sandbox has no `cargo`/`rustc`, so this is written up rather than attempted
blind — same pattern as the earlier `HANDOFF_PATH_FIX_AND_VERIFICATION.md` and
`HANDOFF_VOICE_CRASH_RECOVERY.md`.

Context: Leonardo asked for a Chat/Memory/Skills/Connections upgrade (pasted spec, 2026-08-11).
The plan is `CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md`; Milestones 21, 22, 23, 24, 25, 26, 28, 29
are all built and committed (see `ROADMAP.md`/`TASKS.md`/`CHANGELOG.md` for each). Milestone 27
is the only one left, and it's the one the plan flagged as needing `cargo`.

## Part 1: four pending Supabase migrations (Leonardo, not Claude Code)

These need to be run in order in the Supabase SQL editor (same process as Milestone 7's
`0001_init.sql` — paste, run, confirm "Success. No rows returned"):

1. `packages/database/migrations/0002_chat.sql` — conversations/messages
2. `packages/database/migrations/0003_connections.sql` — connections/connection_capabilities (seeded)
3. `packages/database/migrations/0004_skills.sql` — skills/skill_connections (seeded; must run after 0003)
4. `packages/database/migrations/0005_activity_events_skill_tracking.sql` — adds columns to the
   existing `activity_events` table (must run after 0002 and 0004)

Until these run, Chat/Connections/Skills/Activity all work fine against `LocalStore` (nothing
breaks), they just don't sync through Supabase yet. Local Claude Code can remind Leonardo of this
or run it via the Claude in Chrome extension the same way Milestone 7's migration was pasted in,
if that's easier than Leonardo doing it by hand — either is fine, no code change either way.

## Part 2: Milestone 27, Memory index

**Goal** (from the plan doc): turn `MemoryView.tsx` from a single "check recent memory" button
into a real, browsable index of the Obsidian vault (`~/Documents/Obsidian Vault`) — file path,
title, folder, last-modified, tags. Read-only. Obsidian stays the single source of truth for
content; this is navigation metadata only, never a copy of note content into Supabase (or
anywhere else).

**Why it needs cargo:** every other Milestone 21-29 piece stayed frontend-only by routing through
the existing `run_orchestrator` Tauri command (ask `claude` to read the vault and describe it in
prose — see `check-memory` in `commandEngine.ts`). A real index needs structured data (a list of
files with metadata), not a prose summary — that means either:

- A new Tauri command that walks the vault directory and returns structured file metadata
  (path, title from frontmatter or first heading, modified time, folder, tags parsed from
  frontmatter or `#tags`), using Rust's `std::fs`/`walkdir` or similar, **or**
- Adding `tauri-plugin-fs` (confirmed **not** currently a dependency — checked
  `apps/desktop/backend/Cargo.toml` this session) and using its scoped-path filesystem APIs from
  the frontend directly.

Either path needs `cargo build`/`cargo tauri dev` to compile and test, which Cowork's sandbox
doesn't have.

**Recommended approach** (not mandatory, just what fits the rest of this codebase's patterns):
a new Tauri command, e.g. `list_vault_notes`, in a new `apps/desktop/backend/src/memory.rs`
(mirroring how `orchestrator.rs`/`voice.rs` are each scoped to one concern). Scope its filesystem
access to the vault path only (`~/Documents/Obsidian Vault`), not the whole home directory —
`SECURITY.md`'s "no unrestricted filesystem access where a scoped path will do" rule, same
principle already applied to the Obsidian MCP scoping notes in `MCP_SETUP.md`. Return a `Vec` of
a struct like:

```rust
struct VaultNote {
    path: String,       // relative to the vault root
    title: String,       // first H1, or filename if none
    folder: String,      // "Daily", "Inbox", "Notes", "Briefs", "System"
    modified: String,    // ISO 8601
    tags: Vec<String>,   // parsed from frontmatter `tags:` or inline #tags
}
```

Frontend side (no cargo needed for this part, could even be done first and stubbed against a
fake `invoke` in a test, then wired for real once the Rust side exists): update `MemoryView.tsx`
to call `invoke("list_vault_notes")`, render a real list/table (folder filter, maybe a simple
text search over title), and keep the existing "Check recent memory" button as-is alongside it
(that's still a genuinely different, valid capability — a prose summary vs. a structured index,
per the plan doc's UI CHANGES section).

**Test before marking done**, same standard as every other milestone here: `cargo test` for the
new Rust code, run it against the real vault (not a fixture) at least once by hand, and don't
mark M27 "done" in `ROADMAP.md`/`TASKS.md` until it's been seen live in the actual running app —
this repo's own rule (`ARCHITECTURE.md`: "never mark something complete because the UI renders").

## Not in scope for this handoff

`memory_index`/`memory_events` as Supabase tables (mentioned as a *possibility* in the original
plan doc, explicitly deferred there too) — the plan doc's own DATABASE CHANGES section already
flags that a local index might not need Supabase at all. Decide that when actually building this,
not from this handoff.
