# Changelog

Full changelog for M1–M29 (2026-08-09 to 2026-08-11) is archived at
[`docs/archive/CHANGELOG_M1-29.md`](docs/archive/CHANGELOG_M1-29.md). Entries below are terse
going forward — see `ROADMAP.md` for current milestone status and `TASKS.md` for active work.

## Unreleased

### 2026-08-11 — Desktop launcher (tooling, not a numbered milestone)
- `~/Desktop/Jarvis.app` — double-click launches JARVIS with no terminal. Compiled with macOS's
  built-in `osacompile` from `scripts/JarvisLauncher.applescript`, which backgrounds
  `scripts/launch-jarvis.sh` and exits immediately (that's what makes it silent, not just
  simple). The script runs the live dev build (`cargo tauri dev`), deliberately not a compiled
  release bundle, since the app is still under active development — revisit once it's
  feature-complete enough that a release build's rebuild-per-change tradeoff makes sense.
- `launch-jarvis.sh` explicitly adds `~/.cargo/bin` to `PATH` before checking for `cargo` — GUI-
  launched processes don't source `.zshrc`, so it's genuinely missing otherwise even though it
  works fine from an interactive terminal. Fails with a real macOS alert, not silently, if
  `cargo` still isn't found.
- Real app icon copied in (`apps/desktop/backend/icons/icon.icns`), not the generic AppleScript
  one.
- Live-verified end to end: first attempt hit a real port-1420 conflict from a leftover `vite`
  process left over from earlier browser-preview testing in this same session — cleared it,
  retried clean, confirmed `target/debug/jarvis` running and Vite serving correctly. See
  `docs/DESKTOP_LAUNCHER.md` for the full writeup and how to rebuild it if the repo ever moves.

### 2026-08-11 — Milestone 35: top-nav migration
- `Sidebar.tsx` (13 items, 5 never-backed placeholders — Research, Automations, Notifications,
  and the old Settings) deleted, replaced by `TopNav.tsx`: a flat 9-item bar — Dashboard, Chat,
  Skills, Memory, Connections, Projects, Tasks, Activity, System. Every item is real except
  System, kept because all three `PROJECT_OBJECTIVE.md` references confirm it as a primary
  destination — it shows an honest `NotBuiltView` until Milestone 36, the same pattern this app
  already uses rather than hiding the gap or faking content.
- Decided against a "more" dropdown for the 4 non-primary-5 views (Projects/Tasks/Connections/
  Activity) — flat list keeps every real view one click away with no extra interaction layer.
  Revisit if the bar feels crowded in practice.
- Renamed two mismatched nav labels while migrating: "Agents" → "Skills" and "Integrations" →
  "Connections" — both always rendered `SkillsView`/`ConnectionsView`, only the label was wrong.
  Updated `lib/popoutViews.ts`'s keys/slugs and `App.tsx`'s `renderActive` switch to match; old
  slugs (`agents`, `integrations`) have no compatibility need since this app has never shipped.
- `.app-shell` changed from a 220px+1fr grid to a flex column (nav row + scrollable `.main`,
  `flex: 1; min-height: 0` on `.main` for correct internal scrolling).
- M32's pop-out buttons moved from `Sidebar.tsx` into `TopNav.tsx`, unchanged otherwise (same
  `useInTauri`/`openViewWindow` mechanism).
- 57 tests passing (unchanged), `tsc -b`/`vite build` clean. Live-verified in a browser preview:
  routing to all 9 items, System's honest not-built state, `?view=skills` standalone rendering
  with the renamed slug (no nav, full width). Rust side untouched — `windows.rs` just passes
  through whatever slug string it's given, so this stayed pure frontend as scoped.

### 2026-08-11 — Milestone 34: visual design system (tokens + `JarvisCore` restyle)
- `.panel` (shared across every view) restyled: bracket-corner accents via two pseudo-elements,
  tightened `--radius-lg` (16px → 4px) for an angular HUD look, accent-glow box-shadow. One CSS
  change, whole app updated with no per-view edits.
- Added a faint theme-driven grid backdrop to `body` (`color-mix` with `--border`, same pattern
  already used elsewhere for opacity — not a hardcoded color).
- `JarvisCore.tsx`: extended (not replaced) with 24 fixed instrument-bezel tick marks and a
  vertical light beam through the core, alongside the existing 3-ring/nucleus animation system.
  All 10 states still read correctly through the additions.
- `status-connected` badges get a small text-shadow glow — deliberately left off unverified/
  not-wired states so the glow stays an honest signal, not decoration.
- 57 tests passing (unchanged), `tsc -b`/`vite build` clean, checked live in a browser preview
  across Holographic Core, Crimson Command, and Neon Void themes plus several `JarvisCore`
  states.

### 2026-08-11 — Milestone 32 Rust half: verified live (`cargo build` clean, real click-through)
- `cargo build` compiled clean on the first try — no fixes needed to `windows.rs`, `main.rs`, or
  `capabilities/default.json`.
- `cargo tauri dev` click-through confirmed: popping out Chat opens a real second OS window
  titled "Chat" with no Sidebar and real persisted conversations; clicking the pop-out button
  again focuses the existing window instead of duplicating it.
- `core:default` permission grant on popped-out windows (`"view-*"` glob) is structurally correct
  but not behaviorally exercised — no code currently calls `event:listen` from a popped-out
  window. Multi-monitor placement untested (single-display dev machine). Full detail in
  `docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md`.

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
