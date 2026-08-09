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

Still open, not yet built: a background-mode path (`claude --bg` + polling `claude agents
--json`, both verified callable by hand per `TASKS.md`) for workflows too long to hold the
command bar's `processing` state on — `continue project` today blocks the UI until the whole
orchestrator turn finishes, which is fine for small steps and increasingly wrong for large ones.
