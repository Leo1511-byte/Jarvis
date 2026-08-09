# JARVIS

A personal AI operating system: one assistant (JARVIS) backed by Claude, with long-term
knowledge in Obsidian, structured state in Supabase, automation in n8n, development work
via Claude Code, and a premium desktop command-center UI with voice input/output.

This repo is the ground-up build of the full master spec. Status: **pre-Milestone 1**.

## Before you read further: the runtime split

The master spec was written as if a single Claude Code agent runs locally on your Mac with
full access to your filesystem, microphone, Docker, and installed tools. This project was
scaffolded from a **Cowork** session, which runs in an isolated cloud sandbox — no access to
your actual machine's Node/Python/Git versions, no microphone, no ability to install software
on your Mac, no persistent local process. See `ARCHITECTURE.md` for the corrected two-tier
design this implies: Cowork is the planning/docs/design partner; a **local Claude Code session
on your Mac** is the actual JARVIS runtime once built.

## What already exists (don't rebuild this)

You have a working lightweight Jarvis today, built on your Obsidian vault at
`/Users/leonardo/obsidian`:
- Scripts: `what_open.py`, `connect_this.py`, `orphan_scan.py` in `System/scripts/`
- A local ElevenLabs voice bridge (`System/voice/speak_daemon.py`, queue/done folders)
- A "Jarvis Command Center" dashboard artifact (Cyber Noir theme, mic input, chat)
- A scheduled daily task that writes a morning brief to `Briefs/` at ~7am
- A memory log at `System/memory.md`

This is real prior art for Milestones 6 (Obsidian memory), 9 (voice), and 14 (calendar-adjacent
briefing). `OBSIDIAN_SETUP.md` covers how the new vault memory files integrate with — not
replace — this existing structure.

## Repo layout

```
jarvis/
  apps/desktop/{frontend,backend}   — the command-center app (not yet started)
  packages/{ui,core,agents,memory,tools,voice,permissions,database,integrations,automations}
  shared/     config/     tests/     scripts/     docs/
```

## Docs index

| Doc | Purpose |
|---|---|
| ARCHITECTURE.md | System design, corrected runtime split, diagrams |
| ROADMAP.md | 20-milestone build order and status |
| TASKS.md | Live task board |
| CHANGELOG.md | What actually shipped, by date |
| SECURITY.md | Credential rules, permission levels |
| INSTALLATION.md | Prerequisites and setup, incl. real system inspection |
| MCP_SETUP.md | Which MCP servers, configured where |
| VOICE_SETUP.md | Wake word, STT, TTS plan vs. what exists today |
| OBSIDIAN_SETUP.md | Vault structure reconciliation |
| DATABASE_SCHEMA.md | Proposed Supabase schema (not yet provisioned) |
| AUTOMATIONS.md | n8n plan vs. current scheduled tasks |
| COMMANDS.md | Target natural-language command set |
| AGENT_SYSTEM.md | Orchestrator + specialist agent routing |
| UI_DESIGN.md | Theme tokens, Jarvis Core states |
| TESTING.md | Test plan per layer |
| TROUBLESHOOTING.md | Error format, known issues |
| SYSTEM_INSPECTION_PROMPT.md | Run this in local Claude Code to complete Milestone 1 |

## Next step

Run `SYSTEM_INSPECTION_PROMPT.md` in a Claude Code session on your actual machine. That's
Milestone 1. Its output feeds the stack decision in `ARCHITECTURE.md` and the setup steps in
`INSTALLATION.md`.
