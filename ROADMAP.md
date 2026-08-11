# Roadmap

Full milestone-by-milestone history (M1–M29, 2026-08-09 to 2026-08-11) is archived at
[`docs/archive/ROADMAP_M1-29.md`](docs/archive/ROADMAP_M1-29.md) — real bugs, real fixes, real
verification notes, worth keeping but too long to stay the working doc. This file is the
current-state summary only.

## Where things stand (2026-08-11)

**Built and live-confirmed:** desktop app shell (Tauri + React), 4-theme system, command
engine (typed + voice, same parser), local orchestrator (shells out to `claude` CLI),
Supabase-backed Projects/Tasks/Chat/Connections/Skills/Activity, Obsidian vault read access,
voice (wake word → transcribe → speak, crash-recovery, one Tauri window only), calendar/email/
GitHub read-only checks, Level 1/2/3 permission classification with a real approval dialog for
Level 3, launchd-based (not n8n) scheduled morning brief (written, not activated).

**Explicitly not built, not started, not stubbed:** anything hardware (3D printer, robotic arm
— no driver, no live Skill, no mention in real device code; M31 added a `domain` field so a
hardware Skill has a real slot, nothing more), multi-window / multi-monitor presence (single
Tauri window, no `WebviewWindow` usage anywhere), school/study tracking, write actions for
calendar/email/GitHub (intentionally deferred — see `SECURITY.md`).

**Known live gaps carried forward:** Memory index / real vault browsing (M27, needs `cargo`,
see [`docs/archive/HANDOFF_MEMORY_INDEX_AND_MIGRATIONS.md`](docs/archive/HANDOFF_MEMORY_INDEX_AND_MIGRATIONS.md)),
bundled-app `PATH` resolution in `orchestrator.rs` (works under `cargo tauri dev`, untested in a
double-clicked release build — see
[`docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md`](docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md)).

## Current milestones

| # | Milestone | Status |
|---|---|---|
| 30 | Docs restructure | **Done, 2026-08-11** |
| 31 | Skills engine redesign | **Done, 2026-08-11** — real `Skill` interface (`skills/types.ts`: permission level, `domain: software \| hardware`, `execute()`) and registry (`skills/registry.ts`) now the single source of truth for the six built-in Skills' prompts, permission levels, and execution — previously duplicated by hand across `commandEngine.ts`'s switch statement, `permissions.ts`, and `lib/store/builtinSkills.ts`. All three now derive from the registry. No hardware Skill added (no device to back one) — `domain` just gives one a real place to slot in later. 57 tests passing (up from 53), `tsc -b`/`vite build` clean, no behavior change |
| 32 | Multi-window foundation | Not started — pop-out windows per view via Tauri `WebviewWindow`, state synced through the existing store, placeable across monitors |
| 33 | Memory index (carried over from M27) | Not started — needs `cargo`, real vault filesystem scanning |
| — | School/study tracking | Not scoped yet — next daily-life depth pass once ambient presence exists to host it |
| — | First hardware Skill (3D printer or robotic arm) | Not scoped yet — deferred until M31's interface exists; no hardware milestone number assigned |

## Working agreement going forward

Lightweight process (per Leonardo, 2026-08-11): one short spec note before a milestone starts,
a terse `CHANGELOG.md` entry when it's done, this table's status updated. No approval-gate
ceremony beyond that — see `VISION.md` for why (single user, not a team).
