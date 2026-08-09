# Testing

No code exists yet to test. This documents the test plan so it's applied as each milestone
ships, rather than retrofitted at the end.

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
