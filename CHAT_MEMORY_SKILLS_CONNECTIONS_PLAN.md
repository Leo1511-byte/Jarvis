# Chat + Memory + Skills + Connections — Integration Plan

Status: **plan only, nothing implemented.** Per Leonardo's spec ("Do NOT modify anything yet")
and this repo's own standing rule (inspect before modifying, plan before major architecture
changes), this document is the required first deliverable. No code, schema, or doc other than
this plan and the `TASKS.md`/`ROADMAP.md` entries pointing to it has been touched.

## CURRENT V1 STATE

- One orchestrator path: `run_orchestrator` / `run_orchestrator_background` (Tauri → local `claude`
  CLI). Everything routes through it with different prompts — no separate agent processes.
- `commandEngine.ts`: `parseCommand`/`executeCommand`, 11 command kinds + `unknown`. Six of them
  (`research`, `continue-project`, `check-calendar`, `check-email`, `check-github`,
  `check-memory`) are exactly what the spec calls "Skills" — a fixed prompt template routed
  through the same orchestrator call. They already exist; they're just hardcoded `switch` cases
  instead of data.
- `permissions.ts`: 3-level classification, enforced today only for `delete-project` via a real
  `ApprovalDialog`/`useApproval` flow.
- Chat, today: `App.tsx` keeps a `LogEntry[]` capped at the last 6 exchanges, in component state
  only — gone on reload, never persisted, no concept of a "conversation." This is the real gap
  the spec's Chat tab closes; there is no existing chat system to duplicate.
- Memory, today: `MemoryView.tsx` (built 2026-08-11) is a single "check recent memory" button that
  asks the orchestrator to read Daily/Inbox/Notes and summarize. Real, but not an index or
  browser — no list of notes, no search, no structure beyond that one summary call.
- Connections, today: not a UI concept at all, but the underlying capability already exists and
  is documented in `MCP_SETUP.md` — Calendar/Gmail (MCP, verified live), GitHub (`gh` CLI,
  verified live), Obsidian (direct filesystem access from `claude`, verified live), Supabase
  (REST + anon key, verified live). `StatusPanel.tsx` already shows connected/unverified/not-wired
  per system. Auth for all of these lives outside this repo already — OS keyring (GitHub HTTPS),
  `.claude/settings.local.json` (gitignored, MCP tool + Bash pre-approvals), Supabase anon key in
  `.env.local`. Nothing here needs a new credential store.
- Database (`packages/database/migrations/0001_init.sql`): `projects`, `tasks`,
  `task_dependencies`, `activity_events` (generic project-scoped event log — type/summary/
  created_at), `settings` (key/value). Permissive single-user RLS. No conversations, messages,
  skills, or connections tables exist yet.
- Sidebar has 12 nav items; 8 are still `NotBuiltView` placeholders (Research, Agents,
  Automations, Integrations, Activity, Notifications, System, Settings).

## REUSABLE COMPONENTS (do not duplicate)

- **Skills = the existing prompt-template pattern**, not a new execution engine. `AGENT_SYSTEM.md`
  already documents this exact design decision ("specialists... a prompt template, not a distinct
  agent process"). The Skills milestone is about giving these six prompts a data row (name,
  description, prompt template, required connections, permission level) instead of a `switch`
  case — not building a second way to run them.
- **Connections = a UI/metadata layer over what `MCP_SETUP.md` and `StatusPanel.tsx` already
  track**, not a new auth system. A `connections` table records *that* Calendar/Gmail/GitHub/
  Obsidian/Supabase/Web exist and what capabilities each has (read-events, send-email, etc.) —
  it never stores a token, key, or credential. Real auth stays exactly where it is today.
- **Orchestrator = unchanged.** `run_orchestrator`/`run_orchestrator_background` stay the only two
  ways any Skill talks to Claude. No new Rust process, no Agent SDK server.
- **Approval flow = unchanged.** `ApprovalDialog`/`useApproval`/`permissions.ts` already implement
  spec §55's format. Skills needing Level 3 route through this, not a new dialog.
- **`activity_events`** is already a generic, project-scoped event log — the natural home for
  skill-run logging (extend, don't duplicate with a parallel `skill_runs` table unless its shape
  genuinely doesn't fit once the real migration is being written).
- **Obsidian stays authoritative for content.** Memory's upgrade is an index (path, title,
  modified time, tags) for browsing/search, never a copy of note content into Supabase.

## REQUIRED CHANGES

1. Persist chat: replace `App.tsx`'s ephemeral 6-entry `log` with real `conversations`/`messages`
   storage, scoped so voice and typed input share one thread instead of the Command Log's
   rolling window.
2. Data-drive the six existing Skills instead of hardcoding them in `commandEngine.ts`'s switch —
   without breaking the 42 passing tests or the exact command-bar/voice parsing behavior already
   confirmed live.
3. Give Connections a real registry + status UI, built on `StatusPanel`'s existing detection
   logic rather than a second implementation of "is Calendar working."
4. Enforce least-privilege at the data level (a Skill row references only the Connections it's
   allowed to use) before enforcing it in any UI.
5. Turn Memory from one summary button into an indexed, browsable view — read-only, sourced from
   real filesystem scans of the vault.

## DATABASE CHANGES

New tables (exact column types to be finalized when each milestone actually starts, per this
repo's own "don't guess a migration before the ticket that needs it" pattern — shapes below are
the working design, not final DDL):

- `conversations` — id, title (nullable, can derive from first message), created_at, updated_at.
- `messages` — id, conversation_id (fk), role (`user`/`jarvis`), content, created_at. This is what
  `App.tsx`'s `LogEntry[]` becomes, persisted.
- `skills` — id, name, description, prompt_template, permission_level (1/2/3, mirrors
  `permissions.ts`), builtin (bool — true for the six migrated commands, distinguishes them from
  anything Leonardo defines later), created_at.
- `connections` — id, name (`calendar`/`gmail`/`github`/`obsidian`/`web`/`supabase`), status
  (mirrors `StatusPanel`'s connected/unverified/not-wired), created_at. **No credential columns,
  ever** — this table is a status/metadata registry only, per the spec's own Phase 15 constraint
  and `SECURITY.md`'s existing "never commit/store credentials" rule.
- `connection_capabilities` — id, connection_id (fk), capability (e.g. `read-events`,
  `send-email`), read_only (bool).
- `skill_connections` — skill_id (fk), connection_id (fk) — join table enforcing which Connections
  a Skill may use.
- `activity_events` — extend with nullable `skill_id`/`conversation_id` columns rather than a new
  logging table, if the shape fits once this is actually written (decide at implementation time).

Migration to be added as `packages/database/migrations/0002_chat_memory_skills.sql`, same pattern
as `0001_init.sql` (permissive single-user RLS, `create table if not exists`). Like Milestone 7,
**Cowork/local Claude Code writes the SQL; Leonardo runs it in the Supabase SQL editor** — no
autonomous migration execution against the real project, consistent with how M7 was actually done.

`memory_index`/`memory_events` (vault-content indexing) are deferred to the Memory milestone
specifically and may turn out not to need Supabase at all — a local SQLite/JSON index scoped to
the vault could be simpler and keeps vault-derived metadata off Supabase entirely. Decide when
that milestone starts, not now.

## OBSIDIAN CHANGES

None to the vault's structure (`Inbox/`/`Daily/`/`Notes/`/`Briefs/`/`System/` stays exactly as
Milestone 6 built it — no numbered-folder scheme, per `OBSIDIAN_SETUP.md`'s existing decision).
The only new thing touching Obsidian is read-only: a directory scan for the Memory index. Content
itself is never written by this plan except through the exact same `check-memory`/`research`
prompts that already do so today.

## UI CHANGES

- New `ChatView.tsx` (replaces the Command Log's role on Dashboard, or sits alongside it —
  decide during M22, see below) — full persisted history, reuses `parseCommand`/`executeCommand`
  unchanged.
- New `ConnectionsView.tsx` (replaces the "Integrations" placeholder) — registry + live status,
  built on `StatusPanel`'s existing per-system detection.
- New `SkillsView.tsx` (replaces "Agents" and/or "Automations" placeholders — exact mapping
  decided at M25) — lists Skills, their required Connections, and lets Leonardo trigger one
  manually.
- `MemoryView.tsx` upgraded from one button to an indexed list + the existing check-recent action
  kept as-is.
- Sidebar unchanged in shape (still 12 items) — placeholders get real views, no new nav items
  invented beyond what the spec asks for.

## VOICE CHANGES

None to the voice pipeline itself (`voice.rs`, `listen_loop.py`, `speak_daemon.py` untouched).
The only change is where a voice transcript's result lands: instead of only appending to the
in-memory Command Log, it also becomes a real `messages` row via the same `executeCommand` call
already in place — voice and typed chat become the same persisted thread instead of two disjoint
views of the same underlying calls.

## SECURITY CONSIDERATIONS

- Matches the spec's own Phase 15 constraint exactly: `connections` never stores passwords, API
  keys, tokens, or credentials — status/capability metadata only. Real auth stays in the OS
  keyring, `.claude/settings.local.json` (gitignored), and `.env.local` (gitignored), exactly as
  today.
- `skills.permission_level` must be enforced the same way `permissions.ts` already enforces
  `delete-project` — no second, weaker approval path for Skills.
- `skill_connections` is the least-privilege mechanism: a Skill cannot invoke a Connection it
  isn't linked to, checked before the orchestrator call is made, not just documented.
- Logging (`activity_events` extension) follows `SECURITY.md`'s existing rule: captures actions/
  errors/state, never captures tokens or auth headers — nothing about this plan changes what's
  safe to log.

## IMPLEMENTATION ORDER (proposed Milestones 21–29)

| # | Milestone | Depends on | Complexity |
|---|---|---|---|
| 21 | Conversations/messages persistence (Chat backbone) | M7 (Supabase) | Low–medium — new tables + store methods, same CRUD pattern as Projects/Tasks |
| 22 | Chat UI (real tab, persisted history) | M21 | Medium — UI-heavy, zero new orchestration logic |
| 23 | Connections registry (data + status UI) | M7, `StatusPanel` | Medium — schema + a view that reads what `StatusPanel` already computes |
| 24 | Skills data model + migrate the 6 existing commands to data-driven | M23 | Medium–high — must not regress 42 passing tests or live-confirmed command behavior |
| 25 | Skills UI + manual invocation | M24 | Medium |
| 26 | skill_runs / activity_events logging extension | M24 | Low–medium |
| 27 | Memory index (real vault browsing) | M6 | Higher — needs actual filesystem scanning, likely cargo/Rust (`tauri-plugin-fs` not yet a dependency); hand off to local Claude Code |
| 28 | Skill-aware permission enforcement in UI | M18 (approval flow), M25 | Medium |
| 29 | Voice ↔ Chat integration polish | M9, M22 | Low–medium |

Sequencing rule carried over from the rest of this repo: data model before UI, existing systems
extended before new ones invented, each milestone tested + `TASKS.md`/`CHANGELOG.md` updated
before the next starts. M27 is the one milestone in this set that needs `cargo` — flagged for
local Claude Code same as prior Rust work, not attempted blind from Cowork.

## Not building

No `CommandEngine2`, no second orchestrator, no new agent framework, no duplicate logging system,
no vault restructuring, no credential store. Every item above is an extension of something that
already exists and is already real.

## Awaiting approval

Per the spec's own instruction, no implementation starts until this is reviewed. Confirm the
order above (or reprioritize) and M21 is the first one that would actually begin.
