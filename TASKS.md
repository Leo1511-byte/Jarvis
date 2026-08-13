# Tasks

Full task history through M1–M29 is archived at
[`docs/archive/TASKS_M1-29.md`](docs/archive/TASKS_M1-29.md). This file tracks only what's
currently active.

## Now

- [ ] **Run `packages/database/migrations/0006_self_upgrade_skill.sql`** in the Supabase SQL
      editor (same as every prior migration) — without it, the live Skills tab shows only 6 of
      the 7 real Skills, since Supabase's `skills` table is seeded once via SQL, not read from
      `skills/registry.ts`.
- [ ] **Milestone 38 needs a real live click-through**, not just unit tests — try a phrase like
      "delete my notes.txt file" in the actual running app (local, not Cowork) and confirm: (1)
      the orchestrator's reply actually starts with `SAFE:` or `NEEDS_APPROVAL:` as asked, (2) a
      `NEEDS_APPROVAL` case shows the real `ApprovalDialog`, (3) approving actually runs the
      second prompt and denying stops cleanly. See `ROADMAP.md`'s M38 row for what's unit-tested
      vs. still open.
- [ ] **Look at the real Jarvis window's System tab** and confirm the Performance panel's CPU/
      memory/disk numbers look plausible against Activity Monitor — the Rust side compiled and
      the app is running clean, but nobody's looked at the actual on-screen numbers yet.
- [ ] **Use voice for real and confirm the self-listening bug is actually gone** — two real code
      defects were found and fixed 2026-08-13 (see `VOICE_SETUP.md`'s dated section), both
      compiled/syntax-checked but neither exercised with a real mic. If it still happens, it's a
      third, different cause — say so rather than assuming these fixes covered it.
- [ ] **Add your Gemini API key to `config.json`'s `gemini_api_key` field** (`System/voice/` in
      the Obsidian vault), switch Voice settings → Conversation engine to "Gemini Live", and try
      a real conversation. Milestone 40's first slice is built and compiled but never run against
      real audio/API — see `VOICE_SETUP.md`'s dated section for exactly what to check (does it
      actually stream both ways, does interrupting it work, does it correctly hang up after
      silence/an end phrase). It can't yet run JARVIS Skills mid-conversation (no tool-calling
      bridge — separate backlog item), so keep test conversations to plain talk for now.
- [ ] **Report back what the command-log fragment bug looked like** (the "I" / "50 days for"
      screenshot, 2026-08-13) — confirmed unrelated to voice (mic was off), likely a typed
      command-bar submission bug. Not yet investigated.

## Next up

Numbered, scoped milestones — see `ROADMAP.md`'s Current milestones table for full detail.
Unscoped ideas live in Backlog below instead of here.

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
- [x] 2026-08-11 — Milestone 34: visual design system (tokens + `JarvisCore` restyle), live-
      verified across all 4 themes in a browser preview. See `ROADMAP.md` for full detail.
- [x] 2026-08-11 — Milestone 35: top-nav migration. `Sidebar.tsx` (13 items, 5 dead placeholders)
      replaced by `TopNav.tsx` (flat 9-item bar, only System is a placeholder and it's honest
      about it). Renamed "Agents"→"Skills", "Integrations"→"Connections" to match what they
      actually render. Live-verified: routing, System's not-built state, `?view=skills` pop-out
      with the renamed slug. See `ROADMAP.md` for full detail.
- [x] 2026-08-11 — Desktop launcher (`~/Desktop/Jarvis.app`, not a numbered milestone — tooling,
      not a feature). Double-click launches the live dev build silently, no terminal. See
      `docs/DESKTOP_LAUNCHER.md`. Live-verified end to end after clearing a leftover-process port
      conflict from earlier browser-preview testing: `target/debug/jarvis` running, Vite served
      clean on 1420.
- [x] 2026-08-11 — Milestone 36: System/Settings view, software slice. New `SystemView.tsx` —
      real App info, real Permissions summary, Connections/Activity summary tiles (link out
      rather than duplicate full content), honest empty Devices panel. No Quick Actions (nothing
      real to back one yet). Live-verified: real counts, honest runtime detection, both
      navigate-out links work. See `ROADMAP.md` for full detail.
- [x] 2026-08-11 — Milestone 38: "ask" extended from permanent describe-only to a real,
      approval-gated action path (SAFE/NEEDS_APPROVAL classification, same `ApprovalDialog` the
      built-in Skills' Level 3 case uses). Unit-tested (4 new tests, 61 total), not yet
      live-verified end to end — see "Now" above.
- [x] 2026-08-11 — Milestone 39: self-upgrade skill (Level 3, "upgrade yourself" with optional
      focus, reuses `continue-project`'s background pattern). Zero new gating code needed thanks
      to M28/M31. Live-verified against the running app: real `ApprovalDialog` fired correctly,
      denial produced "Not approved" with no orchestrator call. Found and fixed a real gap along
      the way — Supabase's `skills` table needed its own migration (`0006_self_upgrade_skill.sql`,
      not yet run — see "Now"). 6 new tests (67 total).
- [x] 2026-08-12 — Milestone 37, frontend + Rust. Performance panel in `SystemView.tsx` polling
      `get_system_stats`. **Real finding while diagnosing "why won't the app open":** `cargo` was
      actually reachable in this Cowork session once `PATH` explicitly included `~/.cargo/bin` —
      `which cargo` fails with the default PATH, which is why every earlier session (including
      this one, initially) concluded "no cargo here." With the PATH fix, `cargo add sysinfo`
      resolved the real version (0.39.6) and `cargo build` succeeded first try, no fixes needed.
      App relaunched clean; nobody's eyeballed the actual numbers yet — see "Now". Noted in
      `CLAUDE.md` as unconfirmed whether this holds for every Cowork session.
- [x] 2026-08-13 — Two voice self-listening bugs found and fixed (see `VOICE_SETUP.md`'s dated
      section): a permanent-deafness gap in `listen_loop.py`'s staleness check (age-check only
      ran between streams, not per-chunk during an open one), and no guard against a second full
      app instance forming its own independent voice-process pair sharing the same
      `speaking.flag` file (`tauri-plugin-single-instance` added, real `cargo build` verified).
      Both compiled/syntax-checked, neither exercised with a real mic yet — see "Now".
- [x] 2026-08-13 — Milestone 40 (first slice): real-time conversational voice via the Gemini
      Live API. New `gemini_live_listen.py` engine, selectable per-user, classic engine
      unchanged. One process handles both mic and speaker (no flag-file coordination, so
      structurally can't have the classic engine's self-listening bug class). Protocol pulled
      from current `ai.google.dev` docs via web fetch. `voice.rs`/`VoiceEvent` extended (24 Rust
      tests, 2 new), frontend gets a "Conversation engine" selector (67 tests unchanged, `tsc -b`/
      `vite build` clean), UI live-checked against the real running app. No tool-calling bridge
      yet (conversation only) — see backlog item 5. Not live-tested with real audio/API key —
      see "Now".

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
5. `[ambient]` Gemini Live tool-calling bridge — Milestone 40 (2026-08-13) built real-time
   conversational voice via the Gemini Live API, but Gemini can't yet run a JARVIS Skill
   mid-conversation. This bridge lets it, via the same approval-gated `commandEngine.ts` path
   the command bar/Chat/Skills tab already use (not a parallel execution system) — marked in
   `gemini_live_listen.py` where it goes. Not started; natural follow-up once M40 is
   live-verified with real audio.
6. `[process]` n8n — only if launchd/cron scripts genuinely become unwieldy; not a default plan.
7. `[daily-life]` Command-bar fragment bug — screenshot from Leonardo, 2026-08-13, showed JARVIS
   responding to partial input it was never actually asked ("I", "50 days for" as separate
   exchanges building up "What day will be in 50 days for"). Confirmed unrelated to voice (mic
   was off in the screenshot) — looks like the typed `CommandBar` submitting on something other
   than a real Enter/click. Not investigated yet; see "Now" for the ask to get repro details.
