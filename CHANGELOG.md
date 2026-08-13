# Changelog

Full changelog for M1–M29 (2026-08-09 to 2026-08-11) is archived at
[`docs/archive/CHANGELOG_M1-29.md`](docs/archive/CHANGELOG_M1-29.md). Entries below are terse
going forward — see `ROADMAP.md` for current milestone status and `TASKS.md` for active work.

## Unreleased

### 2026-08-13 — Fixed: Gemini Live only handled one turn per session
- Headphones test (confirming the echo theory from the previous fix) surfaced a third, distinct
  bug: one exchange worked, then a follow-up question got no response — no error, no crash, just
  silence, matching a process with nothing left listening.
- Root cause: `receive_and_play()` had a single `async for response in session.receive():`, no
  outer loop. "One turn works, then nothing" is strong evidence `session.receive()` is a
  per-turn generator that completes naturally once the model finishes speaking, not one stream
  spanning the whole live session — the mic kept streaming the follow-up the whole time, but
  nothing was left to receive or play the response.
- Fixed: wrapped the `async for` in an outer `while not ended:` loop, re-entering
  `session.receive()` for each subsequent turn. Added a stderr log line so this is visible on
  the next test instead of another silent black box.
- Third real bug found from three consecutive live tests, each genuinely new — noted in
  `VOICE_SETUP.md` as expected for a from-scratch integration against a real-time API, not a
  sign of something more broadly wrong. Python syntax-checked only, not yet re-tested.

### 2026-08-13 — Fixed: Gemini Live session-killing bug + disclosed a real echo limitation
- Re-test after the blocking-I/O fix still cut off after a couple seconds. No exceptions in the
  logs — pointed at intentional code (our own early-return), not a crash.
- Two layers found: (1) no acoustic echo cancellation — built-in speakers/mic means the mic
  picks up JARVIS's own voice, which Gemini's server can transcribe as the user talking and
  treat as an interruption, a real but upstream limitation disclosed in the code and
  `VOICE_SETUP.md` rather than fully fixed (headphones are the workaround; real fix — mic
  gating or true AEC — is a new backlog item). (2) A genuine bug on top of that: the end-phrase
  check was a substring match anywhere in the transcript, so an echoed JARVIS reply containing
  something like "...that's all I can tell you" could kill the entire session outright. New
  `is_end_phrase()` requires a near-exact match instead.
- Python syntax-checked only, not yet re-tested. Recommended next test: headphones/AirPods, to
  isolate whether remaining cutoffs are the echo issue or something else.

### 2026-08-13 — Fixed: Gemini Live froze mid-conversation (blocking I/O on the event loop)
- Leonardo's first real test of Milestone 40 ("doesn't answer most of the time, or cuts off")
  surfaced a genuine bug, not flakiness: `receive_and_play()` called `output_stream.write()` —
  a blocking call — directly inside the same `async def` also reading the network
  (`session.receive()`) and driving mic sends. Every blocking write froze the entire event loop
  until it returned, matching both symptoms exactly (apparent non-answers = stalled mid-response;
  cut-off audio = the stall outlasting the server's pacing).
- Fixed: playback moved to a dedicated thread reading from a thread-safe `queue.Queue`;
  `receive_and_play()` now only ever does a non-blocking `.put()`. Interruption handling
  (flushing queued audio) updated to match, using a sentinel instead of aborting/recreating the
  stream inline. Same principle `mic_callback` already followed correctly (sounddevice's own
  callback thread, never the asyncio loop) — the output side just didn't have it before.
- Python syntax-checked only (`python3 -m py_compile`) — still no mic in this session to confirm
  the fix resolves the reported symptom. Full writeup: `VOICE_SETUP.md`'s "blocking I/O" section.

### 2026-08-13 — Milestone 40 (first slice): real-time conversational voice via Gemini Live
- New `gemini_live_listen.py` (`System/voice/` in the Obsidian vault) — a second, selectable
  voice engine alongside the unchanged `classic` pipeline (`config.json`'s new `voice_engine`
  field). Wake word (openWakeWord, reused as-is) still gates when a live session opens —
  Leonardo's explicit choice over push-to-talk or always-on, for cost/privacy — then the
  session stays open for natural back-and-forth via the real Gemini Live API until a ~45s
  silence timeout or an end phrase ("that's all," "stop listening," etc.).
- **Protocol pulled from `ai.google.dev`'s current docs via web fetch, not training-data
  memory** — specifically because a fast-moving realtime API is exactly the kind of thing worth
  getting verified-current facts for: the `google-genai` SDK's async session pattern
  (`client.aio.live.connect`), audio format (16-bit PCM, 16kHz in / 24kHz out), and the manual
  tool-response handling shape. One specific, disclosed uncertainty: the interruption signal's
  exact field name (`server_content.interrupted`) wasn't independently confirmed against a real
  session.
- **Architecturally can't have the classic engine's self-listening bug class**: a live session
  is bidirectional over one connection with server-side turn detection, so one process handles
  both mic capture and speaker playback — no second process, no shared `speaking.flag` file, no
  coordination race to have.
- `voice.rs`: listener slot/monitor/crash-recovery infrastructure reused for both engines
  (`start_voice_listener` now takes an `engine` argument; `listener_script_for_engine` picks the
  script). `VoiceEvent`'s `rename_all` changed from `"lowercase"` to `"snake_case"` (a no-op for
  the 4 existing single-word variants, required for the 3 new multi-word ones —
  `LiveSessionStart`/`LiveTranscript`/`LiveSessionEnd` — to match Python's `live_session_start`
  etc.). 24 Rust tests passing (2 new), real `cargo build`/`cargo test`.
- Frontend: new "Conversation engine" selector in Voice settings (`useVoiceSettings.ts`,
  `VoiceSettings.tsx`), `useVoiceListener` passes the engine through and skips starting
  `speak_daemon.py` for `gemini_live` (it speaks directly, no queue needed). Live transcripts
  persist straight to Chat, one message per turn — no fixed "you asked, JARVIS answered" pair
  the way the classic Command Log (`LogEntry`) expects. 67 tests passing (unchanged), `tsc -b`/
  `vite build` clean, UI live-checked in a browser tab against the actual running app (selector
  renders both options, choice persists).
- **Deliberately scoped out**: Gemini can't yet run a JARVIS Skill mid-conversation — no tools
  registered in the Live session config, no bridge to `commandEngine.ts`'s approval-gated
  execution path. Marked in `gemini_live_listen.py` (`# TOOL-CALLING BRIDGE GOES HERE`) for when
  that's built — added as `TASKS.md` backlog item 5.
- **Not yet live-tested** — no mic, no Gemini API key in this session. Leonardo has a key
  already; needs adding to `config.json`'s `gemini_api_key` and a real conversation test. See
  `TASKS.md`'s "Now".

### 2026-08-13 — Two voice self-listening bugs found and fixed
- Leonardo reported JARVIS still occasionally "listens to its own voice and starts conversating
  with itself," despite the 2026-08-10 feedback-loop fix. Diagnosed from code (no mic access in
  this session) and fixed two real, distinct defects — full writeup in `VOICE_SETUP.md`'s dated
  section:
  1. **Permanent-deafness gap**: `listen_loop.py`'s `speaking.flag` staleness check only ran
     between wake-listening streams, not per-chunk during an already-open one (bare `.exists()`
     check there, no age limit). A flag going stale mid-stream (`speak_daemon.py` crashing
     mid-speech) could deafen the listener forever. Fixed via a shared, age-aware
     `is_actively_speaking()` used by both call sites.
  2. **No single-instance guard**: nothing stopped a second full app launch from spawning its
     own independent `listen_loop.py`/`speak_daemon.py` pair, both sharing the one
     `speaking.flag` file — `speak_daemon.py` unconditionally clears that flag on its own
     startup, so a second instance starting mid-speech would instantly un-mute every listener.
     Added `tauri-plugin-single-instance`; a second launch now focuses the existing window.
- **Real `cargo build` verification**, not a handoff — `cargo`/`rustc` turned out to be
  genuinely reachable in this Cowork session once `PATH` explicitly included `~/.cargo/bin` (see
  `CLAUDE.md`'s note; not yet confirmed whether this holds for every session). Compiled clean.
- Cleared a stale `speaking.flag` found sitting on disk with no process alive to have set it —
  harmless once fix #1 is in place, deleted by hand this time.
- Neither fix has been exercised with a real mic yet — that still needs Leonardo or a local
  session. 67 frontend tests unaffected (pure Python/Rust changes).

### 2026-08-12 — Fixed: app wouldn't open (M37's Rust half genuinely compiled and verified)
- Leonardo reported the Desktop launcher wasn't opening JARVIS. Root cause: `system_stats.rs`
  (added for M37 earlier the same session) imports the `sysinfo` crate, which was deliberately
  never added to `Cargo.toml` — that broke compilation of the *entire* app binary, not just the
  Performance panel, so `cargo tauri dev` failed and no window ever opened. Compounded by two
  earlier test launches from this session leaving `vite`/`cargo-tauri` processes stuck holding
  port 1420 without a working app behind them.
- **Real finding while diagnosing this:** `cargo`/`rustc` turned out to be genuinely reachable
  in this Cowork session at `~/.cargo/bin` once `PATH` was set explicitly
  (`export PATH="$HOME/.cargo/bin:$PATH"`) — `which cargo` fails with the default shell PATH,
  which is why this session (and every prior one) had concluded "no cargo here." With the fix,
  `cargo add sysinfo` resolved the real current version (`0.39.6`) and `cargo build` succeeded
  on the first try — no fixes needed to `system_stats.rs`'s hand-written API usage.
  **Not yet confirmed whether this holds for every Cowork session** — noted in `CLAUDE.md` as an
  open question, not a settled fact.
- Killed the stuck processes, cleared port 1420, relaunched `~/Desktop/Jarvis.app` clean:
  `target/debug/jarvis` running, no compile errors, `System` tab should now show real Performance
  numbers (not yet independently eyeballed against Activity Monitor — see `TASKS.md`).
- Removed the now-stale "deliberately not added" comment from `Cargo.toml` since the dependency
  is genuinely present now, and archived `HANDOFF_M37_SYSTEM_STATS_RUST_VERIFICATION.md`'s
  premise (frontend-only verification) is superseded by this full verification.

### 2026-08-12 — Milestone 37: System real performance stats (frontend done, Rust unverified)
- New Performance panel in `SystemView.tsx` polls a `get_system_stats` Tauri command every 5s
  while mounted, gated on `useInTauri()` (no point polling in a browser preview). Three states
  handled honestly, no fake numbers ever shown: outside Tauri → "Needs the desktop app"; `invoke`
  throws (command missing/erroring) → "Couldn't read system stats — Milestone 37's Rust command
  may not be built yet"; success → real CPU%/memory GB/disk GB.
- New `apps/desktop/backend/src/system_stats.rs` (Rust, **never compiled — no `cargo` in this
  sandbox**): `get_system_stats` using the `sysinfo` crate (`System`/`Disks`) for CPU/memory/
  disk. Deliberately no network figure — kept narrow.
- **Higher-risk handoff than usual**, flagged explicitly in the code and in
  `docs/archive/HANDOFF_M37_SYSTEM_STATS_RUST_VERIFICATION.md`: M32's Rust addition only used
  Tauri's own already-present APIs and compiled clean first try; this pulls in a brand-new
  external dependency this session has never resolved or compiled. `Cargo.toml` was deliberately
  NOT hand-edited with a guessed `sysinfo` version — the handoff says to run `cargo add sysinfo`
  locally instead of trusting a version string written from memory.
- Live-verified in a browser preview against the actual running dev server: the honest
  "needs the desktop app" state renders correctly outside Tauri. The real running Tauri window
  (from this session's earlier desktop-launcher test) would currently hit the "command may not
  be built yet" branch, since Vite HMR reloaded the frontend but the Rust binary hasn't been
  recompiled — exactly the intended degradation.
- 67 tests passing (unchanged — no new command-engine behavior), `tsc -b`/`vite build` clean.

### 2026-08-11 — Milestone 39: self-upgrade skill
- New `self-upgrade` Skill in `skills/registry.ts`: Level 3 (unlike `continue-project`'s Level
  2 — this touches JARVIS's own running code, not an external project), triggered by "upgrade
  yourself" / "update yourself" with an optional `: <focus>` suffix. Reuses `continue-project`'s
  exact background-mode-with-sync-fallback pattern.
- If no focus is given, the prompt tells the orchestrator to read `ROADMAP.md`/`TASKS.md` and
  pick the next sensible item itself, then follow this repo's own documented discipline
  (`CLAUDE.md`): inspect first, one change at a time, real tests/build before done, update
  CHANGELOG/ROADMAP/TASKS the same way every milestone in this repo's history has been recorded.
- **Zero new gating/logging code needed** — this is the actual payoff of M28's generic Level-3
  gate and M31's registry redesign: adding a Level 3 Skill is now just a registry entry.
  `permissions.ts` and `App.tsx`'s `SKILL_COMMAND_KINDS`/activity logging picked it up
  automatically.
- `SkillsView.tsx` updated for a third input mode: optional (not required) focus, distinct from
  `research`/`continue-project`'s required topic/name.
- **Live-verified against the actual running desktop launcher instance** (unlike M38, this part
  didn't need a real orchestrator response to test): typing "upgrade yourself" in the command
  bar correctly triggered the real `ApprovalDialog` with accurate Level 3 context/reason/risk
  text; denying it produced "Not approved — nothing was run" in the Command Log with no
  orchestrator call attempted, exactly as designed.
- **Real gap found and fixed during that verification, not swept under the rug:** the running
  app uses real Supabase (`.env.local` is configured), and Supabase's `skills` table is seeded
  once via migration SQL (`0004_skills.sql`) — it doesn't read from `skills/registry.ts` the way
  `LocalStore`'s fallback does. The new Skill genuinely didn't appear in the live Skills tab
  (confirmed: only 6 panel titles rendered, not 7) until this was caught. New
  `packages/database/migrations/0006_self_upgrade_skill.sql` fixes it — **Leonardo needs to run
  this in the Supabase SQL editor**, same as every prior migration.
- 6 new tests (67 total, up from 61): parsing (with/without focus), background-mode routing,
  sync fallback, registry-level Level 3 check. `tsc -b`/`vite build` clean.

### 2026-08-11 — Milestone 38: "do anything it has access to" real action path
- `ask` (`commandEngine.ts`'s fallback for anything not matching a built-in Skill) no longer
  permanently describe-only. New two-call design in a `runAsk` helper: first prompt asks the
  orchestrator to classify its own reply — `SAFE:` prefix if answering only needs reading/
  analyzing/explaining, `NEEDS_APPROVAL:` prefix with a concrete plan if fulfilling the request
  well would mean actually changing something.
- A `NEEDS_APPROVAL` plan routes through the same `ApprovalDialog`/`useApproval` flow the six
  built-in Skills' Level 3 case already uses — new `requestApproval` field on `CommandContext`,
  wired from `App.tsx`'s existing `useApproval()` instance (not a second dialog). Approving
  sends a second, independent prompt telling the orchestrator to actually do it; denying returns
  "Not approved — nothing was run," same message the Skill-level gate uses.
- Deliberately binary (SAFE/NEEDS_APPROVAL), not Level 1/2/3 — unlike a built-in Skill's
  pre-reviewed prompt template, arbitrary free text has no declared permission level to trust
  ahead of time, so treating any real change as needing approval is the safer default.
- **Honesty caveat, documented in code:** this is a behavioral guardrail via prompting, not a
  technical sandbox. Nothing prevents the model from acting before classifying — same limitation
  the old always-describe prompt had, just carried forward, not newly introduced.
- If the orchestrator's reply doesn't follow the SAFE/NEEDS_APPROVAL format at all, falls back to
  relaying the raw reply (matches the old behavior) rather than blocking.
- `help`'s text updated to describe the new behavior honestly instead of the old "I'll just ask
  Claude directly and read back what it says."
- 4 new tests (61 total, up from 57) covering the gating logic: approve-then-execute, deny-then-
  stop, no-approval-flow-available fallback, and format-fallback. `tsc -b`/`vite build` clean.
- **Not yet live-verified end to end** — needs a real Tauri session where the actual `claude` CLI
  is asked to follow the SAFE/NEEDS_APPROVAL convention and the approval dialog is confirmed to
  fire correctly; a browser preview can't exercise this since `invoke` fails outside Tauri. See
  `TASKS.md`'s "Now" for the suggested live test phrase.

### 2026-08-11 — Milestone 36: System/Settings view, software slice
- New `SystemView.tsx` replaces the `System` placeholder. Real data only, per
  `PROJECT_OBJECTIVE.md`'s rule: App panel (version — kept in sync by hand with `package.json`
  since importing it directly would sit outside `tsconfig.json`'s `include: ["src"]` for
  `tsc -b`; dev/production build mode via `import.meta.env.DEV`; Tauri-vs-browser runtime via
  the existing `useInTauri`), Permissions panel (Skill counts by Level 1/2/3, derived live from
  `skills/registry.ts`), Connections and Activity summary tiles (real counts / last 3 real
  events, each with an "Open X →" button wired to a new `onNavigate` prop from `App.tsx`), and
  an honest empty-state Devices panel (checks `SKILLS.filter(s => s.domain === "hardware")`,
  currently always 0).
- **Deliberately does not re-embed `ConnectionsView`/`ActivityView`'s full content** — both
  already have their own top-nav tab since Milestone 35; duplicating full lists here would be
  exactly the "add stuff, don't overload it" note from the visual-reference review. Summary
  tiles that link out instead, matching the references' own "OPEN SECURITY CENTER" pattern.
- **No Quick Actions section.** Every action in the references (Optimize System, Clear Cache,
  Restart Core, Emergency Protocol) needs a real backend call behind it and none exists yet —
  adding non-functional buttons would be a worse violation of the real-data rule than omitting
  the section entirely.
- `System` added to `lib/popoutViews.ts` now that it renders real content instead of
  `NotBuiltView`.
- Fixed a stale label in `ActivityView.tsx`'s empty state ("Agents tab" → "Skills tab",
  left over from Milestone 35's rename).
- 57 tests passing (unchanged — no new command-engine behavior), `tsc -b`/`vite build` clean.
  Live-verified against the actually-running desktop launcher instance (see below): System's
  counts matched the real registries (5 Level-1 / 1 Level-2 / 0 Level-3 Skills, 6 Connections),
  runtime correctly showed "Browser preview" outside Tauri, both "Open X →" links navigated
  correctly.

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
