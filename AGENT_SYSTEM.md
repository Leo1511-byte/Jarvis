# Agent System

## Today

One assistant: Claude, acting as Jarvis, directly. No specialist split exists yet, but as of
2026-08-09 the desktop app has its first real connection to a local orchestrator: the command
bar's `research <topic>` command routes through `apps/desktop/backend/src/orchestrator.rs`,
which shells out to the local `claude` CLI (`claude -p --output-format json`) and returns its
answer. It's synchronous and single-purpose (no routing table, no specialists) — see `ROADMAP.md`
Milestone 10 for what's real vs. still ahead (background-mode long-running tasks, the
"continue project X" workflow below, actual specialist routing).

## Target (Milestone 10/17)

One user-facing orchestrator (JARVIS) that routes to specialists behind the scenes:

| Request pattern | Specialist |
|---|---|
| "Research X" | Research agent |
| "Fix this bug" | Debug / coding agent |
| "Plan the next milestone" | Planning agent |
| "Update documentation" | Documentation agent |

Specialists don't independently touch sensitive systems — Level 3 actions (`SECURITY.md`) still
require approval regardless of which agent is asking.

## Status display (once agents exist)

Per spec §42: Agents page shows agent, current state (IDLE/WORKING/WAITING/BLOCKED/DONE/FAILED),
assigned task, project, start time, result — and never shows "WORKING" when nothing is actually
running. This repo has no agent runtime yet, so there's nothing to display.

## Relationship to Claude Code

"Continue Project X" (spec §62) is the coding-agent workflow: load project context → check
roadmap/tasks/bugs → inspect repo → plan → implement → test → fix → update docs/changelog →
report. This becomes real once Milestone 11 starts and there's an actual local Claude Code
integration point to wire it to.
