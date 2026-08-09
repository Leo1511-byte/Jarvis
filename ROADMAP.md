# Roadmap

Build order from the master spec, kept as-is because it's sound: one milestone at a time,
test and update `TASKS.md`/`CHANGELOG.md` at the end of each.

| # | Milestone | Status | Owner |
|---|---|---|---|
| 1 | System inspection | **Done — 2026-08-09** | You, via local Claude Code |
| 2 | Architecture + repository | Done (stack decision made from real data) | Cowork |
| 3 | Basic Jarvis desktop UI | **Done, verified 2026-08-09** — frontend builds (`npm run build`), and the local Claude Code session compiled the Tauri backend for real: `apps/desktop/backend/target/debug/jarvis` is an actual Mach-O arm64 binary. It corrected two things in Cowork's unverified scaffold (a redundant `[lib]` block in `Cargo.toml`, and relative frontend paths in `tauri.conf.json`) and generated real icons in `apps/desktop/backend/icons/` (source still needs replacing — see Milestone 4 note below) | Cowork (frontend) + local Claude Code (Rust build) |
| 4 | Theme system + Jarvis Core animation | Frontend part done — 4 themes as CSS tokens (`src/theme.css`), animated `JarvisCore` component with all 10 states, `prefers-reduced-motion` respected, theme persists via localStorage. Checked `apps/desktop/backend/icons/icon.png`: it's a distinct blue holographic circular design, not the Marvel/Iron Man GitHub asset flagged earlier — fine to keep | Cowork |
| 5 | Command engine | **Done, verified 2026-08-09** — real parser + executor in `apps/desktop/frontend/src/commandEngine.ts`, 5 unit tests passing (`npm run test`), wired to the (now enabled) command bar. Only 2 real actions exist so far (theme switching, status), everything else honestly returns "not implemented yet" instead of pretending | Cowork |
| 6 | Obsidian memory | **Done, verified 2026-08-09** — real `Inbox/`/`Daily/`/`Notes/`/`Briefs/`/`System/` structure built in `~/Documents/Obsidian Vault`, `JARVIS.md`, `System/memory.md`, and all 3 scripts (`what_open.py`, `connect_this.py`, `orphan_scan.py`) written and run successfully against real seeded content | Cowork |
| 7 | Supabase | **Code done, project not provisioned, 2026-08-09** — real client (`src/lib/supabaseClient.ts`), real store implementation (`supabaseStore.ts`), real migration (`packages/database/migrations/0001_init.sql`). Cannot create the actual Supabase project (Cowork doesn't create accounts) — see `INSTALLATION.md` for the exact steps you need to run | Cowork (code) / you (provisioning) |
| 8 | Projects + tasks | **Done, verified 2026-08-09** — real CRUD UI (`ProjectsView`, `TasksView`), backed by a local-storage adapter that implements the same interface Supabase will (`getStore()` switches automatically once M7's project exists). Sidebar nav now actually routes between views instead of always showing the dashboard. 11 tests passing, build verified | Cowork |
| 9 | Voice + wake word | **Partially done, 2026-08-09.** Stack decided (openWakeWord + faster-whisper, local; ElevenLabs, cloud, behind an interface — see `VOICE_SETUP.md`). 3 Python scripts written in `~/Documents/Obsidian Vault/System/voice/` (syntax-checked, **not run** — no mic in the sandbox that wrote them). Frontend voice settings UI built and verified (`npm test`/`build` pass): real device enumeration, real permission status where supported, persisted toggles. Nothing wires the Python scripts to the Tauri app yet | Cowork |
| 10 | Claude / agent orchestration | Not started | — |
| 11 | Claude Code project development mode | Not started | — |
| 12 | GitHub | Not started | — |
| 13 | n8n | Not started | — |
| 14 | Calendar | Not started (Google Calendar connector suggested, not authorized) | — |
| 15 | Email | Not started (Gmail connector suggested, not authorized) | — |
| 16 | Web research | Not started (Cowork can do this today ad hoc, not wired into JARVIS) | — |
| 17 | Specialist agents | Not started | — |
| 18 | Permissions + security | **Done, verified 2026-08-09** — `src/permissions.ts` classifies command kinds into Level 1/2/3 per spec §54. Level 3 (`delete-project`) is enforced with a real `ApprovalDialog` (ACTION/CONTEXT/REASON/RISK per spec §55) and `useApproval` promise-based hook — nothing deletes until the user clicks Approve, every time, no auto-approve. Wired into `ProjectsView`'s Delete button (the actual gated action) and recognized (not executed) by the typed command bar, which honestly redirects to the UI instead of faking a confirmation flow in text. 16 tests passing, build verified | Cowork |
| 19 | Testing + performance | Not started | — |
| 20 | V1 polish | Not started | — |

## Sequencing note

Milestones 1–2 are done (2026-08-09). Stack is decided: Tauri, Supabase Cloud, no n8n initially
(launchd/cron scripts instead), local Claude Code as orchestrator, vault at
`~/Documents/Obsidian Vault` — see `ARCHITECTURE.md`. Before Milestone 3 starts: relocate this
repo out of the Claude session artifacts folder to somewhere durable (e.g. `~/Developer/jarvis`),
and recheck disk space (~22 GiB free at inspection time) since the Rust toolchain install is
next.
