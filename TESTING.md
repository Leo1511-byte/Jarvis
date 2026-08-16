# Testing

This documents the test plan so it's applied as each milestone ships, rather than retrofitted
at the end.

## Actual coverage so far (2026-08-09, updated post-launch-verification)

- **Automated:** 20 frontend unit tests passing (`npm run test` in `apps/desktop/frontend`) —
  `commandEngine.test.ts`, `permissions.test.ts`, `localStore.test.ts`. 3 Rust unit tests
  passing (`cargo test` in `apps/desktop/backend`) covering `orchestrator.rs`'s JSON parsing.
  `tsc -b` and `vite build` re-verified after every change that touched the frontend.
  **Correction:** the earlier "16 tests passing" claim after the vitest 2→4 bump was wrong —
  Node 25's experimental native `localStorage` (enabled by default) was shadowing jsdom's,
  breaking 6 of `localStore.test.ts`'s tests (`localStorage.clear is not a function`). It wasn't
  caught at the time because the failure only reproduces with `vitest run` invoked plainly, and
  apparently wasn't re-run cleanly after that commit. Fixed by adding
  `NODE_OPTIONS=--no-experimental-webstorage` to the `test` script in `package.json`. Lesson:
  re-run the actual test command after any tooling bump, don't trust a prior "it passed" note.
- **Manually verified against real systems, not mocks:** Tauri backend compiled to a real
  Mach-O arm64 binary and **launched for real** via `cargo tauri dev` — Vite served on `:1420`,
  backend compiled, `target/debug/jarvis` process came up and to the foreground; `morning_brief.py`
  run against the actual vault and produced a correct `Briefs/2026-08-09.md`; the 3 vault scripts
  from Milestone 6 (`what_open.py`, `connect_this.py`, `orphan_scan.py`) run-tested against real
  seeded content; `transcribe.py` (M9) run end-to-end by Leonardo (mic → whisper → correct
  transcript); Calendar/Gmail MCP connectors (M14/15) called directly and returned real data;
  `gh auth status` (M12) confirmed real GitHub auth.
- **Written but unverified:** `wake_listener.py` and `speak_daemon.py` (M9) — the latter blocked
  on an empty `elevenlabs_api_key`.
- **M10 first slice:** the `research <topic>` command (Rust `run_orchestrator`, shelling out to
  `claude -p --output-format json`) has automated coverage for its JSON parsing (Rust unit
  tests) and for `commandEngine.ts`'s routing (mocked `runOrchestrator`), and the manual CLI
  behavior it wraps was verified directly (`claude -p ... --output-format json`, `claude --bg`,
  `claude agents --json` all exercised by hand before writing the Rust code around them). What's
  **not yet verified**: an actual "research topic" typed into the running app's command bar,
  end to end through the real webview IPC bridge — that needs a human at the actual window, see
  `project/TASKS.md`.
- **Not applicable yet:** M16/17's own test rows below — those milestones are architecture-only
  beyond M10's first slice (see `project/ROADMAP.md`), there's no further implementation to test.
- **Not started:** performance benchmarking (app startup, command latency).

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

A milestone doesn't close in `project/ROADMAP.md`/`project/TASKS.md` until its test above actually passes —
not when the UI merely renders (spec principle #6).
