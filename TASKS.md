# Tasks

## Now

- [ ] Relocate this repo out of the Claude session artifacts folder to somewhere durable, e.g.
      `~/Developer/jarvis` (flagged as a risk in the inspection report).
- [ ] Spot-check `~/Desktop/Jarvis.app`, `~/plugins/jarvis`, the `jarvis.ios` container, and the
      `jarvis-desktop` remnants in `~/.Trash` for naming collisions before Milestone 3 names
      anything "Jarvis" on disk.
- [ ] Before Milestone 6: actually build the `Inbox/`/`Daily/`/`Notes/`/`Briefs/`/`System/`
      structure in `~/Documents/Obsidian Vault` — it doesn't exist yet, despite earlier docs
      implying it did.

## Done

- [x] 2026-08-09 — Repo scaffolded: directory structure, `.gitignore`, git initialized.
- [x] 2026-08-09 — `ARCHITECTURE.md` written with corrected Cowork/local-Claude-Code runtime split.
- [x] 2026-08-09 — `ROADMAP.md` mapped to 20 milestones with honest status.
- [x] 2026-08-09 — Docs skeleton (`SECURITY.md`, `INSTALLATION.md`, and 10 subsystem docs) written,
      each stating current status rather than pretending completion.
- [x] 2026-08-09 — Milestone 1 (system inspection) run locally, report saved to
      `~/Documents/Obsidian Vault/System/SYSTEM_INSPECTION_REPORT.md`.
- [x] 2026-08-09 — Vault path confirmed as `~/Documents/Obsidian Vault` (not
      `/Users/leonardo/obsidian`, which is empty); `OBSIDIAN_SETUP.md` and `ARCHITECTURE.md`
      corrected accordingly.
- [x] 2026-08-09 — Stack decided from real hardware/disk data: Tauri, Supabase Cloud,
      launchd/cron instead of n8n initially, local Claude Code confirmed as orchestrator.

## Blocked

- Milestone 3 (desktop UI): blocked on relocating the repo and re-checking free disk space
  (~22 GiB at inspection time) before the Rust toolchain install.
- Milestone 6 (Obsidian memory): blocked on actually building the vault structure — nothing
  beyond `.obsidian/` exists there yet.
- Milestones 7+: no longer blocked on the stack decision (made), but each still starts only
  when its turn in `ROADMAP.md` comes up.

## Backlog (unscoped, from the original spec — do not start yet)

Desktop UI, theme system, wake word, Supabase schema rollout, GitHub write actions, n8n
workflows, calendar/email integration, specialist agent routing, permission/approval UI. Each
gets its own entry here once its milestone is actually starting, per "avoid building dozens of
unfinished features at once."
