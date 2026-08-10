# Agent System

## Today (updated 2026-08-09)

One orchestrator, reached through one Tauri command: `run_orchestrator`
(`apps/desktop/backend/src/orchestrator.rs`) shells a prompt out to the local `claude` CLI
(`claude -p --output-format json`) and returns its answer, synchronously.

"Specialists" (below) turned out not to need separate routing infrastructure, at least not yet:
`commandEngine.ts` has four command kinds that call the same `run_orchestrator` with different,
purpose-built prompts — `research`, `continue-project`, `check-calendar`, `check-email`. Each
prompt tells the orchestrator what to do and, for the read-only ones, explicitly says so ("don't
send/draft/label anything"). That's the whole "specialist" mechanism right now: a prompt
template, not a distinct agent process, model, or persona. Simpler than what Milestone 17
originally sketched, and honestly so — there's no evidence yet that four different fixed
personas would behave differently than one Claude instance given a clear, scoped prompt each
time. Revisit if/when that stops being true (e.g., a coding-specific system prompt measurably
outperforms a generic one for `continue-project`).

## Target (Milestone 17, if ever needed)

The original per-specialist routing table, kept for reference in case prompt-template routing
turns out to be insufficient:

| Request pattern | Specialist |
|---|---|
| "Research X" | Research agent |
| "Fix this bug" | Debug / coding agent |
| "Plan the next milestone" | Planning agent |
| "Update documentation" | Documentation agent |

Specialists don't independently touch sensitive systems — Level 3 actions (`SECURITY.md`) still
require approval regardless of which agent (or prompt template) is asking.

## Status display (once agents exist)

Per spec §42: Agents page shows agent, current state (IDLE/WORKING/WAITING/BLOCKED/DONE/FAILED),
assigned task, project, start time, result — and never shows "WORKING" when nothing is actually
running. Still not built: every orchestrator call today is a single synchronous request/response
(the command bar shows `processing` while it's in flight, same as any other command), not a
long-running background task with its own lifecycle to display. Worth building once the
background-mode path below exists — a status list for calls that finish in under a few seconds
would just be noise.

## Relationship to Claude Code

"Continue Project X" (spec §62) is real now: `continue project <name>` in the command bar sends
the orchestrator a prompt covering the full workflow (load context → inspect repo → decide and
implement the next step → test → update docs/changelog → report). It's Level 2 in
`permissions.ts` — writes to a project repo, traceable via the orchestrator's session id and the
repo's own git history, but not gated per-action the way a delete is.

## Background mode, 2026-08-10

`continue-project` now runs in the background instead of blocking the command bar:
`orchestrator.rs` gained `run_orchestrator_background` (`claude --bg <prompt>`, returns
immediately), `poll_orchestrator_background` (`claude agents --json --all`, polled every 5s by
the frontend), `fetch_orchestrator_background_result`, and `stop_orchestrator_background`. The
other four commands (`research`/`check-calendar`/`check-email`/`check-github`) stay synchronous
on purpose — they're quick reads, and a background job for each would just add polling overhead
for no benefit.

Three things learned by hand in a terminal while building this (not just assumed from the
2026-08-09 smoke test) that shaped the design:
- `--bg` and `-p`/`--output-format` conflict — `--bg`'s launch confirmation is plain text
  (`backgrounded · <id>`), parsed with a small string function, not JSON.
- `claude agents --json --all` gives a job's status (`state: "done"` once finished) and its full
  session UUID, but **no field ever carries the actual result text** — confirmed even after
  `claude stop`.
- The only clean way found to retrieve the result: resume the finished session with
  `--fork-session` (so it doesn't disturb the still-alive background session) and ask it to
  repeat its last answer, with `--output-format json` same as the synchronous path — reuses the
  already-tested `parse_claude_output`. This costs one extra small API call per completed job and
  asks the model to *reproduce* text rather than reading it back byte-exact — a real limitation,
  not hidden. (`claude logs <id>` was tried first and rejected: it's a raw ANSI terminal capture
  with cursor-positioning escapes and redrawn spinner frames, built for a human's terminal, not
  for parsing.)

10 new Rust unit tests cover the parsing logic, using **real captured output** from those
terminal experiments as fixtures rather than guessed JSON shapes. Not yet verified: an actual
`continue project <name>` run clicked through the live app window — same GUI-access gap noted
elsewhere for this session (no WindowServer access to its own launched window). The background
plumbing itself (launch → poll → fetch → stop) was exercised by hand end-to-end in a terminal
with a real (trivial) background job before being translated into Rust.
