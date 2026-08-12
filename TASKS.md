# Tasks

Full task history through M1–M29 is archived at
[`docs/archive/TASKS_M1-29.md`](docs/archive/TASKS_M1-29.md). This file tracks only what's
currently active.

## Now

(nothing in progress — see "Next up")

## Next up

Numbered, scoped milestones — see `ROADMAP.md`'s Current milestones table for full detail.
Unscoped ideas live in Backlog below instead of here.

- [ ] Milestone 34 — Visual design system: tokens + `JarvisCore` restyle (pure frontend)
- [ ] Milestone 35 — Top-nav migration, depends on M34 (pure frontend; still needs a decision on
      Projects/Tasks/Activity/Integrations' fate in the new nav)
- [ ] Milestone 36 — System/Settings view, software slice, depends on M35 (pure frontend, reuses
      M23/M26/M28)
- [ ] Milestone 37 — System/Settings real performance stats (needs `cargo`)
- [ ] Milestone 38 — "Do anything it has access to" real action path (independent of 34-37)
- [ ] Milestone 39 — Self-upgrade skill (independent of 34-37, needs its Level 3 approval-flow
      specifics worked out first)
- [ ] Milestone 33 — Memory index, carried over from M27 (needs `cargo`)

## Done

- [x] 2026-08-11 — Milestone 30: docs restructure.
- [x] 2026-08-11 — Milestone 31: Skills engine redesign (`skills/types.ts` + `skills/registry.ts`
      now the single source of truth for the six built-in Skills; `commandEngine.ts`,
      `permissions.ts`, `lib/store/builtinSkills.ts`, and `App.tsx`'s `SKILL_COMMAND_KINDS` all
      derive from it instead of hand-duplicating). No behavior change, no hardware Skill added.
      57 tests passing, `tsc -b`/`vite build` clean.
- [x] 2026-08-11 — Milestone 32, frontend + Rust, both verified. Any real view pops out into its
      own Tauri window. `cargo build` succeeded first try; live-confirmed via `cargo tauri dev`
      that popping out Chat opens a real second OS window (correct title/content/no sidebar) and
      a second click focuses it instead of duplicating. `core:default` permission glob is
      structurally correct but not yet behaviorally exercised; multi-monitor placement untested
      (single-display dev machine). Full detail:
      `docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md`.
- [x] 2026-08-11 — Added `PROJECT_OBJECTIVE.md`: walked through Leonardo's final-product vision
      (open-ended command execution, Iron Man styling, device tab, explicit self-upgrade,
      self-organization) plus three visual references, with decisions locked in.
- [x] 2026-08-11 — Scoped `PROJECT_OBJECTIVE.md` into Milestones 34-39 in `ROADMAP.md`'s Current
      milestones table, in build order, none started yet.

## Blocked

(none)

## Backlog

Unscoped ideas — no milestone number, no spec note, nothing started. An item only gets promoted
to `ROADMAP.md`'s Current milestones table once it's actually about to start (see `CLAUDE.md`'s
working agreement). Prioritized, top = most likely next; add new ideas at the point they come
up rather than letting them evaporate. Tagged by which `VISION.md` pillar each serves —
`[daily-life]`, `[workshop]`, `[ambient]`, or `[process]` for things that aren't feature work —
so it's visible if one pillar's being neglected (daily-life has had all the real progress so
far).

1. `[process]` Fix `orchestrator.rs`'s bundled-app `PATH` resolution gap — see
   `docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md`. Blocks a real release build.
2. `[daily-life]` School/study tracking — next daily-life depth pass, per VISION.md's explicit
   naming of it as a core job, not a side feature. M32's window foundation is now live-verified,
   so this is unblocked whenever it's prioritized above Milestones 34-39.
3. `[workshop]` First hardware Skill (3D printer or robotic arm) — needs M31's `Skill` interface
   (done) plus an actual reachable device; not scoped until Leonardo names which device and
   what "start a print job" or equivalent should really do.
4. `[daily-life]` GitHub/email/calendar write actions (currently read-only by design, see
   `SECURITY.md`) — real Level 3 surface, needs a considered approval-flow design before any
   of it starts.
5. `[process]` n8n — only if launchd/cron scripts genuinely become unwieldy; not a default plan.
