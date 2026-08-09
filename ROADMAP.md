# Roadmap

Build order from the master spec, kept as-is because it's sound: one milestone at a time,
test and update `TASKS.md`/`CHANGELOG.md` at the end of each.

| # | Milestone | Status | Owner |
|---|---|---|---|
| 1 | System inspection | **Blocked — needs you** | You, via `SYSTEM_INSPECTION_PROMPT.md` in local Claude Code |
| 2 | Architecture + repository | In progress (this scaffold) | Cowork |
| 3 | Basic Jarvis desktop UI | Not started | Local Claude Code |
| 4 | Theme system + Jarvis Core animation | Not started | — |
| 5 | Command engine | Not started | — |
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

Milestones 1–2 happen once. Milestone 3 onward requires a decision on where JARVIS actually
runs (see `ARCHITECTURE.md` — open decision), which depends on Milestone 1's real hardware/tool
inventory. Don't start 3 before 1 is done for real.
