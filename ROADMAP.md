# Roadmap

Build order from the master spec, kept as-is because it's sound: one milestone at a time,
test and update `TASKS.md`/`CHANGELOG.md` at the end of each.

| # | Milestone | Status | Owner |
|---|---|---|---|
| 1 | System inspection | **Done — 2026-08-09** | You, via local Claude Code |
| 2 | Architecture + repository | Done (stack decision made from real data) | Cowork |
| 3 | Basic Jarvis desktop UI | **Frontend built and verified (`npm run build` succeeds); Tauri backend scaffolded but unverified — no Rust in the sandbox that wrote it, see `apps/desktop/backend/README.md`** | Cowork (frontend) / you (Rust build) |
| 4 | Theme system + Jarvis Core animation | **Done in the frontend** — 4 themes as CSS tokens (`src/theme.css`), animated `JarvisCore` component with all 10 states, `prefers-reduced-motion` respected, theme persists via localStorage | Cowork |
| 5 | Command engine | Not started — command bar is a disabled visual placeholder | — |
| 6 | Obsidian memory | Partially exists (see `OBSIDIAN_SETUP.md`) | — |
| 7 | Supabase | Not started | — |
| 8 | Projects + tasks | Not started | — |
| 9 | Voice + wake word | Partially exists (ElevenLabs bridge, no wake word) | — |
| 10 | Claude / agent orchestration | Not started | — |
| 11 | Claude Code project development mode | Not started | — |
| 12 | GitHub | Not started | — |
| 13 | n8n | Not started | — |
| 14 | Calendar | Not started (Google Calendar connector suggested, not authorized) | — |
| 15 | Email | Not started (Gmail connector suggested, not authorized) | — |
| 16 | Web research | Not started (Cowork can do this today ad hoc, not wired into JARVIS) | — |
| 17 | Specialist agents | Not started | — |
| 18 | Permissions + security | Not started | — |
| 19 | Testing + performance | Not started | — |
| 20 | V1 polish | Not started | — |

## Sequencing note

Milestones 1–2 are done (2026-08-09). Stack is decided: Tauri, Supabase Cloud, no n8n initially
(launchd/cron scripts instead), local Claude Code as orchestrator, vault at
`~/Documents/Obsidian Vault` — see `ARCHITECTURE.md`. Before Milestone 3 starts: relocate this
repo out of the Claude session artifacts folder to somewhere durable (e.g. `~/Developer/jarvis`),
and recheck disk space (~22 GiB free at inspection time) since the Rust toolchain install is
next.
