# Handoff: bundled-app PATH fix + live verification of the latest frontend slice

Written 2026-08-11 from the Cowork session, while Leonardo is away for a couple hours and asked
to get as much of the roadmap covered as possible. Everything below either needs `cargo` (not
available in that sandbox) or a live screenshot of the actual running window -- both things you
have and it doesn't. Pick this up whenever you see it; no need to wait for Leonardo.

## 1. Fix the bundled-app `PATH` resolution gap (real Rust work)

`apps/desktop/backend/src/orchestrator.rs` resolves `claude` via `Command::new("claude")`, which
relies on `PATH`. That's fine under `cargo tauri dev` (inherits the launching shell's environment)
but will silently fail in a double-clicked, Finder-launched bundled `.app` (minimal PATH, no
`~/.local/bin`). This has been a known, deliberately-deferred gap since Milestone 10 (see its
comment block at the top of `orchestrator.rs` and the `ROADMAP.md`/`TASKS.md` rows for M10/M20).

It's worth fixing now: M7/M9/M10/M12/M14/M15/M16 are all confirmed live as of 2026-08-11, and M20
(V1 polish) is the last milestone before this is genuinely close to a real v1. A bundled build
that silently can't find `claude` would be a bad surprise to hit late.

Suggested approach (not prescriptive -- use your judgment once you're looking at it):
- Resolve `claude`'s absolute path once, at either build time or first run, instead of trusting
  bare `PATH` resolution at every `Command::new("claude")` call site (there are 5: `run_orchestrator`,
  `run_orchestrator_background`, `poll_orchestrator_background`, `fetch_orchestrator_background_result`,
  `stop_orchestrator_background`).
- A reasonable runtime approach: try common install locations (`~/.local/bin/claude`,
  `/usr/local/bin/claude`, `/opt/homebrew/bin/claude`) plus whatever `PATH` already has, in order,
  and cache whichever one actually exists/works. `gh` doesn't have this problem since GitHub
  commands go through `claude`'s own bash tool, not a direct `Command::new("gh")` -- only `claude`
  itself needs this.
- Test the fix by actually building a bundled app (`cargo tauri build`) and either double-clicking
  it from Finder or launching it with a stripped-down `PATH` (`env -i PATH=/usr/bin:/bin
  open ./target/release/bundle/macos/Jarvis.app` or similar) and confirming a `research`/
  `check-calendar`/etc. command still works. This is the first time the bundled build will have
  been tested at all -- don't assume `cargo tauri build` itself succeeds without checking.
- Add Rust unit tests for whatever resolution function you write, following this file's existing
  pattern of using real captured fixtures where possible.
- Update `ROADMAP.md` (M10, M20's "known limitation" note) and `TASKS.md`/`CHANGELOG.md` when done.

## 2. Re-run the GitHub-check benchmark a few more times

`scripts/benchmark_orchestrator.sh` (written 2026-08-10/11, already committed) measured real
orchestrator latency: research/check-calendar/check-email landed in a tight 12-19s band across 3
runs each, but `check-github` was 25s/25s/**44s** -- one run 76% slower than the other two. Worth
finding out if that's normal variance (rate limiting, network, differing amounts of PR/issue data
that particular run) or something systematic before assuming it's noise.

Run it a few more times focused on just that command (you can comment out the other `run_sync`
calls and `run_background` in the script, or just let the whole thing run again -- it's not
expensive, a few cents per run per the cost numbers already collected) and see if 40+ second runs
keep showing up. If they do, dig into why (maybe `gh` is doing more work than expected, maybe it's
resolvable with a more specific prompt). If it was a one-off, note that in `TASKS.md` and move on.

## 3. Verify the two frontend features Cowork just shipped (commit `b252409`), live

Both are frontend-only (no `cargo` needed to write, but nobody's actually looked at them in the
running window yet -- same "verified by tests, not by eyes" gap this project always closes before
calling something done):

- **Active project selection**: `ProjectsView` now has a "Set Active" / "Active" button on each
  project card. Click it on a project, then check the Dashboard's "Active Project" panel shows
  that project's real name and status instead of the old hardcoded "No active project selected"
  text. Delete the active project and confirm the Dashboard panel correctly reverts to "no active
  project" instead of showing stale/broken data.
- **Interim "still working" feedback**: type a command that hits the orchestrator (e.g.
  `research <topic>`) and confirm that if it takes more than ~6 seconds, a "Still working on
  that…" line appears above the Command Log, and disappears once the real response lands. (Given
  the 12-44s latencies measured above, this should reliably trigger.)

`cargo tauri dev` should pick up the frontend changes via hot reload if it's already running;
otherwise relaunch it. Take a screenshot (you already have `screencapture` access per
`.claude/settings.local.json`) of both states so there's real visual proof, not just "it compiled."

## When done

Update `TASKS.md`'s relevant "Now" entries to reflect what actually got confirmed vs. what's
still open, and delete this file (same convention as `HANDOFF_VOICE_CRASH_RECOVERY.md`, which is
already gone). Don't wait for Leonardo to review before doing any of this -- he explicitly asked
for as much of the roadmap covered as possible while he's away.
