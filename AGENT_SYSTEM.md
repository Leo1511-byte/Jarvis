# Agent System

## Today

One assistant: Claude, acting as Jarvis, directly. No orchestrator/specialist split exists.

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
