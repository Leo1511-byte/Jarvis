# Testing

This documents the test plan so it's applied as each milestone ships, rather than retrofitted
at the end.

## Actual coverage so far (2026-08-09, Milestone 19 check-in)

- **Automated:** 16 frontend unit tests passing (`npm run test` in `apps/desktop/frontend`) —
  `commandEngine.test.ts`, `permissions.test.ts`, `localStore.test.ts`. `tsc -b` and
  `vite build` re-verified after every change that touched the frontend.
- **Manually verified against real systems, not mocks:** Tauri backend compiled to a real
  Mach-O arm64 binary (local Claude Code); `morning_brief.py` run against the actual vault and
  produced a correct `Briefs/2026-08-09.md`; the 3 vault scripts from Milestone 6
  (`what_open.py`, `connect_this.py`, `orphan_scan.py`) run-tested against real seeded content.
- **Written but unverified:** the 3 voice scripts (M9) — syntax-checked only, no microphone in
  the sandbox that wrote them.
- **Not applicable yet:** M12/14/15/16/17's own test rows below — those milestones are
  architecture-only (see `ROADMAP.md`), there's no implementation to test.
- **Not started:** performance benchmarking (app startup, command latency) — meaningless before
  M3's visual launch is confirmed by a human, which hasn't happened yet.

## Required tests, by milestone

- **Memory (M6):** create note → read → search → modify → restart → search again → confirm
  persistence.
- **Project (M8):** open project → read state/tasks → add task → update → complete → update
  changelog → confirm dashboard reflects it.
- **Voice (M9):** "Hey Jarvis" → response; "Open Project X" → context loads; task add via
  voice persists; theme switch via voice works; context retained across follow-ups; wake-word
  mode resumes after timeout.
- **GitHub (M12):** read repo state, latest commit, branch, detect file changes, inspect an
  issue — using a safe test repo, no push without explicit approval.
- **Automation (M13):** create a safe automation (e.g. status summary), run it, confirm result
  recorded, confirm failure handling actually surfaces an error rather than hanging silently.
- **Permissions (M18):** trigger a simulated Level 3 action, confirm approval is required, deny
  it, confirm nothing happened, then approve a harmless one and confirm it's logged.
- **Database (M7):** create/update test project and task, restart, confirm persistence, clean
  up test data safely.
- **Full restart (ongoing from M4 on):** theme, settings, active project, tasks, memory,
  integration config, database state, and voice config all survive an app restart.

## Rule

A milestone doesn't close in `ROADMAP.md`/`TASKS.md` until its test above actually passes —
not when the UI merely renders (spec principle #6).
