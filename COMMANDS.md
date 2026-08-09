# Commands

## Working today, in the desktop app's command bar

**Local (Milestone 5, done 2026-08-09) — no orchestrator call, answered directly:**

- `switch to <theme>` / `use <theme>` — real, changes the theme immediately. Aliases: crimson
  (command), neon (void), holographic (core)/hologram, obsidian.
- `system status` / `status` — returns an honest summary (nothing is wired to real integrations
  yet, and it says so).
- `help` / `what can you do` — lists what's actually available.
- `delete project <name>` — recognized (for permission classification), but deliberately not
  executed from the command bar. Redirects to the Projects view's Delete button, the real
  approval-gated path (`ApprovalDialog`/`useApproval`, `permissions.ts` Level 3).

**Orchestrator-routed (Milestone 10/11/14/15/16, done 2026-08-09) — each shells a prompt out to
the local `claude` CLI via `apps/desktop/backend/src/orchestrator.rs`'s `run_orchestrator` Tauri
command, and returns its answer. Real network/subprocess calls, not instant — the UI should show
a working state, not assume these resolve like the local commands above:**

- `research <topic>` — asks the orchestrator to research the topic and write findings to a new
  note in `Notes/`.
- `continue project <name>` — spec §62's workflow: load context, inspect the repo, decide and
  implement the next step, test it, update docs, report back. Level 2 (writes to a project repo,
  traceable via the orchestrator's session id and the repo's own git history — not gated
  per-action like a delete).
- `check my calendar` / `check calendar` / `what's on my calendar` / `show my calendar` — reads
  today's + the next couple of days' events via the Calendar MCP server already configured
  locally (verified 2026-08-09). Explicitly prompted read-only.
- `check my email` / `check my inbox` / `check my mail` — same pattern via the Gmail MCP server,
  also explicitly prompted read-only.

All four are Level 1 (research/calendar/email — explicitly read-only) or Level 2
(continue-project — writes, but not sensitive in the delete/send/deploy/purchase sense) per
`permissions.ts`. None are Level 3, so none go through `ApprovalDialog` — see `SECURITY.md` for
what does.

Parser + executor: `apps/desktop/frontend/src/commandEngine.ts`, tested in
`commandEngine.test.ts` (`npm run test`, 18 tests covering this file alone). Same engine sits
behind both typed and spoken input once wake-word/STT are wired to the app (Milestone 9's
remaining gap) — no separate command behaviors per spec §32.

## Working today, via the Obsidian vault (the pre-existing Jarvis skill, Cowork/Claude chat only)

"what's open," "connect this," "file this," "orphan check" — script-backed, run against
`~/Documents/Obsidian Vault`. These aren't reachable from the desktop app's command bar yet;
they only work in a Claude conversation that has the `jarvis` skill loaded.

## Target examples from the spec — not built yet

Open Ape War. What should I work on? Create a task. Remember this. Search memory for camera
controller.

Each still needs a real backend behind it first (projects/tasks UI exists via M8, but the command
bar doesn't route to it yet; memory search needs M6's structure extended with a search index)
before the command engine can route to it honestly. Adding the phrase without the backend would
mean lying about what "help" lists as available.
