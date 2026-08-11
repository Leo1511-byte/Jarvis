# JARVIS

Leonardo's personal AI assistant — local, single-user, not a product. See `VISION.md` for what
it's actually for and why. Backed by Claude, with structured state in Supabase, long-term
memory in Obsidian, and a Tauri desktop command-center UI with voice input/output.

Status, 2026-08-11: core daily-life assistant slice is real and live-confirmed (calendar,
email, GitHub, Obsidian memory, chat, voice). Ambient multi-window presence and any hardware
integration (3D printer, robotic arm) have not been started — see `ROADMAP.md` for exactly
where the line is.

## Runtime split

Two tiers, not one: **local Claude Code** (or an Agent SDK process) running on Leonardo's Mac
is the actual JARVIS orchestrator — the only tier with real filesystem/mic/hardware access.
**Cowork** (cloud, sandboxed) is the design/docs/code partner that can't touch the machine
directly. See `ARCHITECTURE.md` for the full split and why it exists.

## Repo layout

```
jarvis/
  apps/desktop/{frontend,backend}   — the actual app: Tauri (Rust) + React/TS, real code
  packages/{ui,core,agents,memory,tools,voice,permissions,database,integrations,automations}
                                     — mostly scaffolding (.gitkeep) today; only
                                       database/migrations has real content
  docs/archive/                     — full milestone-by-milestone history (M1-29)
  shared/     config/     tests/     scripts/
```

Don't assume the `packages/` split reflects real module boundaries yet — almost everything
that exists today lives in `apps/desktop/frontend/src`.

## Docs index

| Doc | Purpose |
|---|---|
| CLAUDE.md | Auto-loaded orientation for any Claude session working in this repo |
| VISION.md | What JARVIS is for, who it's for, open questions |
| ARCHITECTURE.md | System design, runtime split, stack decisions |
| ROADMAP.md | Current milestone status (full history in `docs/archive/`) |
| TASKS.md | Live task board |
| CHANGELOG.md | What's shipping now (full history in `docs/archive/`) |
| SECURITY.md | Credential rules, permission levels |
| INSTALLATION.md | Prerequisites and setup |
| MCP_SETUP.md | Which MCP servers, configured where |
| VOICE_SETUP.md | Wake word, STT, TTS — what exists |
| OBSIDIAN_SETUP.md | Vault structure |
| DATABASE_SCHEMA.md | Supabase schema |
| AUTOMATIONS.md | launchd-based scheduled tasks |
| COMMANDS.md | Natural-language command set |
| AGENT_SYSTEM.md | Orchestrator + Skills routing |
| UI_DESIGN.md | Theme tokens, Jarvis Core states |
| TESTING.md | Test plan per layer |
| TROUBLESHOOTING.md | Error format, known issues |

## Running it

```
cd apps/desktop/backend && cargo tauri dev
```

See `INSTALLATION.md` for prerequisites (Rust, Node) if this is a fresh machine.
