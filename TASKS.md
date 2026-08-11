# Tasks

Full task history through M1–M29 is archived at
[`docs/archive/TASKS_M1-29.md`](docs/archive/TASKS_M1-29.md). This file tracks only what's
currently active.

## Now

- [ ] Milestone 32 — Multi-window foundation: pop-out windows per view via Tauri
      `WebviewWindow`, state synced through the existing store, placeable across monitors.

## Next up

- [ ] Milestone 33 — Memory index (carried over from M27, needs `cargo`)

## Done

- [x] 2026-08-11 — Milestone 30: docs restructure.
- [x] 2026-08-11 — Milestone 31: Skills engine redesign (`skills/types.ts` + `skills/registry.ts`
      now the single source of truth for the six built-in Skills; `commandEngine.ts`,
      `permissions.ts`, `lib/store/builtinSkills.ts`, and `App.tsx`'s `SKILL_COMMAND_KINDS` all
      derive from it instead of hand-duplicating). No behavior change, no hardware Skill added.
      57 tests passing, `tsc -b`/`vite build` clean.

## Blocked

(none)

## Backlog (unscoped — do not start yet)

School/study tracking, first hardware Skill, GitHub/email/calendar write actions, n8n (if ever
needed), bundled-app `PATH` resolution fix in `orchestrator.rs`.
