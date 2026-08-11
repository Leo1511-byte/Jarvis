# Handoff: Milestone 32 (multi-window) — Rust side needs `cargo`

Written 2026-08-11 by Cowork, which has no `cargo`/`rustc` in this sandbox (same limitation as
the M27 and PATH-fix handoffs). The frontend half of Milestone 32 is built, tested, and
live-verified (see below); the Rust half is written but has never compiled.

## What's built and verified (frontend)

- `apps/desktop/frontend/src/lib/popoutViews.ts` — single source of truth for which Sidebar
  views can pop out (`Dashboard`, `Chat`, `Projects`, `Tasks`, `Memory`, `Agents`,
  `Integrations`, `Activity` — deliberately excludes the still-`NotBuiltView` sections).
- `apps/desktop/frontend/src/lib/windowManager.ts` — `openViewWindow(slug, title)`, calls the
  new `open_view_window` Tauri command.
- `Sidebar.tsx` — a pop-out (`⧉`) button next to each real view's nav item, only rendered when
  `useInTauri()` is true.
- `main.tsx` — reads `?view=<slug>` from the URL once at startup, passes it to `App` as
  `standaloneView`.
- `App.tsx` — when `standaloneView` is set: resolves it to a Sidebar view name via
  `SLUG_TO_VIEW`, skips rendering `Sidebar`, and disables the voice listener (a popped-out
  window must never start a second wake-word process — `voice.rs`'s listener is one global
  backend resource, not per-window).
- Verified live in a browser preview (not Tauri, but exercises the exact same React code path):
  `http://localhost:1420/?view=chat` and `?view=activity` both render the single view full-width
  with no sidebar, and `ChatView` correctly loads real persisted conversations from the store —
  confirms the standalone window isn't just an empty shell.
- 57 tests still passing (unchanged — this milestone didn't add command-engine-level behavior),
  `tsc -b`/`vite build` both clean.

## What's NOT verified (needs `cargo`)

- `apps/desktop/backend/src/windows.rs` (new) — `open_view_window` Tauri command:
  `WebviewWindowBuilder::new(&app, &label, url).title(...).inner_size(...).build()`, label
  `view-<slug>`, focuses instead of duplicating if already open. **Never compiled.**
- `main.rs` — added `mod windows;` and registered `windows::open_view_window` in
  `invoke_handler`. **Never compiled.**
- `capabilities/default.json` — `"windows"` changed from `["main"]` to `["main", "view-*"]` so
  popped-out windows get `core:default` permissions (event:listen, etc.) instead of silently
  lacking them, the same class of bug Milestone 9 hit with the very first capabilities file.
  **The glob pattern `"view-*"` has never been tested against Tauri's actual ACL matcher.**

## What to actually do

1. `cd apps/desktop/backend && cargo build` — fix whatever doesn't compile (API surface for
   `WebviewWindowBuilder`/`WebviewUrl` in Tauri 2 was written from memory, not verified against
   the installed version's docs).
2. `cargo tauri dev`, then in the running app: click a pop-out button (e.g. Chat) in the
   Sidebar. Confirm: a real second OS window opens, titled "Chat", showing just the Chat view
   with no Sidebar. Click the same button again — confirm it focuses the existing window instead
   of opening a second one.
3. Confirm the popped-out window can actually run things that need `core:default` permissions —
   e.g. trigger a Level 3 approval dialog from it, or (most directly) check that voice-related
   `event:listen` calls in that window don't error, even though the window disables the voice
   *listener* itself (the capability should still be granted; that's a distinct check from
   "does it actually start listening").
4. Drag the new window to a second monitor if one's available — confirms placement isn't
   artificially constrained to the main display.
5. Update `ROADMAP.md`'s M32 row and this handoff's status once confirmed.
