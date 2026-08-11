# Tasks

Full task history through M1–M29 is archived at
[`docs/archive/TASKS_M1-29.md`](docs/archive/TASKS_M1-29.md). This file tracks only what's
currently active.

## Now

- [ ] **Milestone 32's Rust half needs `cargo`** — `windows.rs`/`main.rs`/`capabilities/
      default.json` are written but never compiled. See
      `docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md` for exactly what to build and
      click through.

## Next up

- [ ] Milestone 33 — Memory index (carried over from M27, needs `cargo`)

## Done

- [x] 2026-08-11 — Milestone 30: docs restructure.
- [x] 2026-08-11 — Milestone 31: Skills engine redesign (`skills/types.ts` + `skills/registry.ts`
      now the single source of truth for the six built-in Skills; `commandEngine.ts`,
      `permissions.ts`, `lib/store/builtinSkills.ts`, and `App.tsx`'s `SKILL_COMMAND_KINDS` all
      derive from it instead of hand-duplicating). No behavior change, no hardware Skill added.
      57 tests passing, `tsc -b`/`vite build` clean.
- [x] 2026-08-11 — Milestone 32 (frontend half): any real view can pop out into its own Tauri
      window (`lib/popoutViews.ts`, `lib/windowManager.ts`, `Sidebar.tsx` pop-out buttons,
      `main.tsx`/`App.tsx` standalone rendering). Live-verified in a browser preview
      (`?view=chat`, `?view=activity` both render correctly, no sidebar, real store data).
      Voice listener disabled outside the main window. Rust half unverified — see "Now".

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
   naming of it as a core job, not a side feature. Wants M32's window foundation live-verified
   first so it has somewhere ambient to live.
3. `[workshop]` First hardware Skill (3D printer or robotic arm) — needs M31's `Skill` interface
   (done) plus an actual reachable device; not scoped until Leonardo names which device and
   what "start a print job" or equivalent should really do.
4. `[daily-life]` GitHub/email/calendar write actions (currently read-only by design, see
   `SECURITY.md`) — real Level 3 surface, needs a considered approval-flow design before any
   of it starts.
5. `[process]` n8n — only if launchd/cron scripts genuinely become unwieldy; not a default plan.
