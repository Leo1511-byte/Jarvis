# Commands

## Working today, in the desktop app's command bar (Milestone 5, done 2026-08-09)

- `switch to <theme>` / `use <theme>` — real, changes the theme immediately. Aliases: crimson
  (command), neon (void), holographic (core)/hologram, obsidian.
- `system status` / `status` — returns an honest summary (nothing is wired to real integrations
  yet, and it says so).
- `help` / `what can you do` — lists exactly the above, nothing more.
- Anything else — returns `Not implemented yet: "<what you typed>". See ROADMAP.md.` rather than
  pretending to understand or act on it.

Parser + executor: `apps/desktop/frontend/src/commandEngine.ts`, tested in
`commandEngine.test.ts` (`npm run test`). Same engine is meant to sit behind both typed and
spoken input once STT exists (Milestone 9) — no separate command behaviors per spec §32.

## Working today, via the Obsidian vault (the pre-existing Jarvis skill, Cowork/Claude chat only)

"what's open," "connect this," "file this," "orphan check" — script-backed, run against
`~/Documents/Obsidian Vault`. These aren't reachable from the desktop app's command bar yet;
they only work in a Claude conversation that has the `jarvis` skill loaded.

## Target examples from the spec — not built yet

Open Ape War. Continue development. What should I work on? Create a task. Remember this.
Search memory for camera controller. Research competitors. Show today's schedule.

Each of these needs a real backend behind it first (projects/tasks: Milestone 8; memory search:
Milestone 6 extended with a search index; research: Milestone 16) before the command engine can
route to it honestly. Adding the phrase without the backend would mean lying about what "help"
lists as available.
