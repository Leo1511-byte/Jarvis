# Handoff: Milestone 32 (multi-window) — Rust side, verification status

**Update 2026-08-11 (local Claude Code, real `cargo`): Rust half now built and live-verified.**
See "Verification results" at the bottom. Original Cowork handoff (no `cargo`/`rustc` available)
kept below for context.

---

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

## Verification results (2026-08-11, local Claude Code, real `cargo`)

1. **`cargo build`: clean on the first try.** No fixes needed — `windows.rs`'s
   `WebviewWindowBuilder`/`WebviewUrl` usage, `main.rs`'s `mod windows;` + handler registration,
   and `capabilities/default.json`'s `"windows": ["main", "view-*"]` were all correct as written
   against the installed Tauri 2.
2. **`cargo tauri dev` + live click-through: confirmed.** Screen Recording permission wasn't
   granted to this terminal at first (blocked screenshots) and Accessibility-based UI scripting
   of the WKWebView's DOM content proved unreliable (its AX tree flapped between populated and
   empty across queries — a known flakiness class with WKWebView content, not specific to this
   app). Once Screen Recording was granted, coordinate-based clicking (calibrated against the
   screen's logical point resolution, confirmed via `system_profiler`: 1470x956 points, 2x
   Retina backing) worked reliably. Screenshots confirm: clicking the Chat pop-out button in the
   Sidebar opens a real second OS window titled "Chat", showing just the Chat view (conversation
   list + message pane, real persisted conversations loaded, e.g. "Um, so all of you are cold,
   uh, c-") with no Sidebar. Clicking the same pop-out button again brings the existing Chat
   window to the front (traffic lights become active/colored) rather than opening a duplicate —
   confirmed via screenshot, only one Chat window ever existed.
3. **`core:default` permissions on the popped-out window: not directly exercised, no negative
   evidence either.** The only code in the whole frontend that calls `event:listen` is
   `useVoiceListener.ts` (backed by `voice.rs`'s `voice-event` emit), and it's intentionally
   disabled outside the main window per `App.tsx`'s standalone-view logic — so there is currently
   no real UI path that calls `event:listen` from a popped-out window to observe pass/fail
   against the `"view-*"` capability glob. What's confirmed instead: the glob syntax itself
   (`"view-*"` matching label `"view-chat"`) is standard, well-documented Tauri capability
   matching, not a novel pattern; and no ACL/permission-denied/capability errors appeared in the
   Rust process's stdout/stderr at any point during window creation or interaction. If a future
   milestone adds a second `event:listen` consumer that *does* run in popped-out windows (the
   capabilities file's own description mentions an approval dialog use case, not yet built), that
   would be the first real behavioral test of this glob — worth a quick recheck then.
4. **Second monitor: not testable.** This Mac has exactly one display (`system_profiler
   SPDisplaysDataType`: single "Color LCD" built-in, 2560x1664). Nothing in `windows.rs` (no
   explicit position/screen constraint in the `WebviewWindowBuilder` call) suggests window
   placement would be restricted to the main display, but this is an inference from the code,
   not a live-verified fact.

**Bottom line: the Rust half works.** Compile, launch, real second window, correct title/content/
no-sidebar, and focus-not-duplicate are all live-confirmed. The capability-glob permission grant
is structurally correct and produced no errors, but wasn't behaviorally exercised because no
current code path calls `event:listen` from a popped-out window. Multi-monitor placement is
untested for lack of a second display, not for any known bug.
