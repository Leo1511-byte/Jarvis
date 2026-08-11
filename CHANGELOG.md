# Changelog

Full changelog for M1–M29 (2026-08-09 to 2026-08-11) is archived at
[`docs/archive/CHANGELOG_M1-29.md`](docs/archive/CHANGELOG_M1-29.md). Entries below are terse
going forward — see `ROADMAP.md` for current milestone status and `TASKS.md` for active work.

## Unreleased

### 2026-08-11 — Milestone 32: multi-window foundation (frontend done, Rust unverified)
- New `windows.rs` (Rust, **never compiled — no `cargo` in this sandbox**): `open_view_window`
  Tauri command opens a view in its own labeled window (`view-<slug>`) or focuses it if already
  open. `capabilities/default.json`'s `"windows"` widened from `["main"]` to `["main", "view-*"]`
  so popped-out windows get the same `core:default` permissions the main window has.
- New `lib/popoutViews.ts` (single source of truth for which 8 real views can pop out) and
  `lib/windowManager.ts` (`openViewWindow`). `Sidebar.tsx` gets a pop-out button per real view,
  shown only inside Tauri (`useInTauri`).
- `main.tsx` reads `?view=<slug>`; `App.tsx` renders just that view standalone (no Sidebar) when
  present, and disables the voice listener outside the main window — `voice.rs`'s wake-word
  process is one global backend resource, not one per window.
- No cross-window state sync layer — each window independently reads the same store (Supabase
  or LocalStore). Explicitly out of scope for this milestone; revisit if it's actually needed.
- Live-verified in a browser preview (not Tauri itself, but the same React code path):
  `?view=chat` and `?view=activity` both render correctly. Rust side — compiling, an actual
  second OS window opening, capability glob matching — needs `cargo`, see
  `docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md`.
- 57 tests passing (unchanged), `tsc -b`/`vite build` clean.

### 2026-08-11 — Milestone 31: Skills engine redesign
- New `skills/types.ts` (`Skill` interface: id, name, description, permission level,
  `domain: "software" | "hardware"`, connection ids, `execute()`) and `skills/registry.ts`
  (the six built-in Skills, ported behavior-identical from `commandEngine.ts`'s old inline
  switch — same prompts, same background/sync fallback logic for continue-project).
- `commandEngine.ts`'s `executeCommand`, `permissions.ts`'s `permissionLevelFor`,
  `lib/store/builtinSkills.ts`'s `BUILTIN_SKILLS`, and `App.tsx`'s `SKILL_COMMAND_KINDS` /
  `ORCHESTRATOR_ROUTED_KINDS` all now derive from the registry instead of separately
  hand-duplicating the same six ids/prompts/levels — closes the drift risk `permissions.test.ts`
  and `App.tsx`'s own comments previously flagged as unenforced.
- `domain` gives a future hardware Skill (3D printer, robotic arm) a real place to slot in
  later; no hardware Skill was added — there's no device to back one yet.
- New `skills/registry.test.ts` (4 tests). 57 tests total (up from 53), `tsc -b`/`vite build`
  clean, no behavior change.

### 2026-08-11 — Milestone 30: docs restructure
- Archived `ROADMAP.md`/`TASKS.md`/`CHANGELOG.md` (M1-29 history) to `docs/archive/`.
- Rewrote all three as lean, current-state docs.
- Removed 11 stray `dist.bak_*` build-backup folders from `apps/desktop/frontend/`.
