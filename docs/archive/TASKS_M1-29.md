# Tasks

## Now

- [ ] 2026-08-11 — **Milestone 29 (voice ↔ Chat integration polish) built.** Turned out the main
      thing this milestone asked for — voice transcripts landing in Chat, not just the Dashboard's
      Command Log — was already true by construction: `useVoiceListener`'s `onTranscript` calls
      the exact same `handleCommand(text, true)` typed input uses, and Milestone 21's message
      persistence lives inside `handleCommand` itself, not gated to typed-only. What this
      milestone actually added: voice error/crash-recovery notifications (`onError`/`onStatus`,
      previously only in the ephemeral `log`) now also persist as `(voice) ...` messages, so
      scrolling back through Chat shows what actually happened with voice, not just successful
      exchanges. Extracted a small `persistMessage(role, content)` helper so this and
      `handleCommand`'s existing two persisted messages share one implementation instead of three
      near-identical fire-and-forget blocks. `tsc -b`/`npm run test` (53 passing, unchanged)/
      `vite build` all clean. **All of Milestones 21-26, 28-29 are done** — the only remaining
      item from the Chat/Memory/Skills/Connections plan is M27 (Memory index), which needs
      `cargo` and is being handed off, not attempted blind. See
      `HANDOFF_MEMORY_INDEX_AND_MIGRATIONS.md`.
- [ ] 2026-08-11 — **Milestone 28 (skill-aware permission enforcement) built — real gap found
      and closed.** While wiring this, found that `permissionLevelFor` (`permissions.ts`) was
      dead code: defined, unit-tested, but never actually called anywhere in the running app —
      the only real Level 3 enforcement was `ProjectsView`'s Delete button, hand-wired to its own
      `useApproval`/`ApprovalDialog` instance specifically. `App.tsx`'s `handleCommand` now checks
      `permissionLevelFor(command.kind)` for every `SKILL_COMMAND_KINDS` command before running
      it; if it's Level 3, the same real approval flow (`useApproval`/`ApprovalDialog`, spec §55
      format) gates it — denying it logs "Not approved — nothing was run" and stops before
      `executeCommand` is ever called. **`delete-project` is deliberately untouched** (not in
      `SKILL_COMMAND_KINDS`) since `executeCommand`'s delete-project case is intentionally a
      redirect-to-UI stub, not something this generic path should start executing. **None of the
      six built-in Skills are actually Level 3 today**, so this changes no live behavior yet — it's
      the general mechanism so the next Level 3 Skill (e.g. a future "send email" or "delete note")
      gets a real approval gate automatically instead of needing bespoke per-command wiring.
      `tsc -b`/`npm run test` (53 passing, unchanged — nothing tested here changed)/`vite build`
      all clean.
- [ ] 2026-08-11 — **Milestone 26 (activity logging for Skill runs) built.** Extended the
      `activity_events` table `0001_init.sql` created back at Milestone 7 but that had zero store
      methods or UI ever reading/writing it — first real use of that table. New
      `ActivityEvent`/`NewActivityEventInput` types + `listActivityEvents`/`createActivityEvent`
      store methods. `App.tsx`'s `handleCommand` now logs every Skill run (the six
      `SKILL_COMMAND_KINDS` — matches `builtinSkills.ts` exactly, "ask" excluded since it isn't a
      named Skill) with skill id, conversation id, and active project id, fire-and-forget same as
      message persistence. New "Activity" sidebar section (`ActivityView.tsx`, replaces its
      `NotBuiltView` placeholder) lists them most-recent-first. New
      `packages/database/migrations/0005_activity_events_skill_tracking.sql` — **fourth new
      migration**, must run after `0002_chat.sql` and `0004_skills.sql` (new columns reference
      both). **Incidental fix found while wiring this up:** `check-memory` was missing from
      `ORCHESTRATOR_ROUTED_KINDS`, so it never got the "still working on that" interim-feedback
      banner the other four `check-*` commands get on a slow response — added it. Also fixed a
      real ordering bug caught by the new tests: `LocalStore.listActivityEvents` originally
      sorted by `createdAt` string, but two events created in the same millisecond (easy to hit,
      including live) tie under a string sort with undefined order — switched to reversing
      insertion order instead, which is reliable regardless of timestamp resolution. 2 new tests
      (53 total, up from 51). `tsc -b`/`npm run test`/`vite build` all clean.
- [ ] 2026-08-11 — **Milestone 25 (Skills UI + manual invocation) built.** New "Agents" sidebar
      section is real now (`SkillsView.tsx`, replacing its `NotBuiltView` placeholder) — lists
      M24's six Skills with description, permission level, and which Connections each uses, plus
      a Run button per skill. `check-calendar`/`check-email`/`check-github`/`check-memory` run
      with one click (canonical trigger phrase, e.g. "check my calendar" — the exact text a
      person would type); `research`/`continue-project` get an inline text input for the
      topic/project name first. Zero new execution logic — `onRun` is the same
      `text => handleCommand(text)` `ChatView` already uses, so running a Skill here goes through
      `parseCommand`/`executeCommand` exactly like the command bar, voice, or Chat would (same
      permission level, same prompt, same everything). `tsc -b`/`npm run test` (51 passing,
      unchanged)/`vite build` all clean. Not yet seen live.
- [ ] 2026-08-11 — **Milestone 24 (Skills data model) built — deliberately scoped down from
      the original plan's wording, flagged explicitly.** The plan called this "medium-high
      complexity — must not regress 42 passing tests or live-confirmed command behavior," which
      is exactly why `commandEngine.ts` was **not** touched: rewriting its six proven, live-
      confirmed prompt templates (research/continue-project/check-calendar/check-email/
      check-github/check-memory) to read from a data table at runtime would have been the risky
      version of this milestone for no user-visible gain yet. Instead, built a descriptive
      registry alongside it: new `Skill`/`skills`/`skill_connections` types + store methods
      (`listSkills`, `listSkillConnections`), seeded with the same six commands, each declaring
      its real `permissionLevel` (matching `permissions.ts` exactly — now enforced by a new
      regression test, `permissions.test.ts`, comparing the two directly) and which of the six
      Connections it uses. `continue-project` intentionally has zero declared connections — it
      operates on the local filesystem/git, which isn't one of the six registered Connections;
      forcing a mapping would've been dishonest. New
      `packages/database/migrations/0004_skills.sql` (**third new migration Leonardo needs to
      run**, after `0002_chat.sql`/`0003_connections.sql`, and must run after `0003` since
      `skill_connections` references `connections`). See `lib/store/builtinSkills.ts`'s doc
      comment for the full reasoning. 3 new tests (51 total, up from 48). `tsc -b`/
      `npm run test`/`vite build` all clean. No UI yet for this — that's Milestone 25.
- [ ] 2026-08-11 — **Milestone 23 (Connections registry) built.** New "Integrations" sidebar
      section is now real (`ConnectionsView.tsx`, replacing its `NotBuiltView` placeholder) —
      read-only registry of the six connections already real in this app (calendar, gmail,
      github, obsidian, web, supabase), each showing live status (same connected/unverified/
      not-wired honesty rule as `StatusPanel`, computed the same way, never read from the DB) and
      its capabilities (`read-events`, `read-email`, etc.) with a read-only/write flag. New
      `Connection`/`ConnectionCapability` types + `listConnections`/`listConnectionCapabilities`
      store methods, implemented in both `LocalStore` (returns a fixed built-in list — see
      `lib/store/builtinConnections.ts`) and `SupabaseStore` (real queries against the new
      `connections`/`connection_capabilities` tables). `packages/database/migrations/
      0003_connections.sql` creates and seeds them — **another migration Leonardo needs to run**
      in the Supabase SQL editor (same as 0001/0002); until then `listConnections()` against
      Supabase will error, same fallback-unavailable pattern as Chat. Extracted `useInTauri.ts`
      out of `StatusPanel.tsx` so the new view reuses the exact same "genuinely running in Tauri"
      check instead of a second copy. **This table stores identity/capability metadata only —
      no credentials, ever** — matches the plan's own security section. 2 new `localStore.test.ts`
      tests (48 total, up from 46). `tsc -b`/`npm run test`/`vite build` all clean. Not yet seen
      live.
- [ ] 2026-08-11 — **Milestone 22 (Chat tab) built, same session as M21.** New `Chat` sidebar
      item (between Dashboard and Projects) and `ChatView.tsx`: a conversation switcher (list +
      "New chat") on the left, full persisted message thread + input on the right. Zero new
      command logic — the input's `onSubmit` is the exact same `handleCommand` the command bar
      and voice already use, so anything typed in Chat behaves identically (same parsing, same
      orchestrator calls, same permission levels). `App.tsx` gained `messages`/`conversations`
      state (loaded via M21's new store methods), `handleNewConversation`, and
      `useCurrentConversation`'s new `selectConversation` setter so switching chats in the UI
      and `handleCommand`'s persistence stay in sync — same hook instance, not two copies of
      "current conversation" state. Dashboard's Command Log is still there, unchanged, showing
      the same rolling last-6 — Chat is additive, not a replacement. `tsc -b`, `npm run test`
      (46 passing, unchanged — `ChatView` itself isn't unit tested, matching the existing
      pattern of `DashboardView`/`MemoryView`), `vite build` all clean. Not yet seen live.
- [ ] 2026-08-11 — **Leonardo approved the plan ("go") — Milestone 21 (chat backbone) built.**
      New `Conversation`/`Message` types + 4 `JarvisStore` methods (`listConversations`,
      `createConversation`, `listMessages`, `createMessage`), implemented in both `LocalStore`
      and `SupabaseStore` (same dual-implementation pattern as Projects/Tasks).
      `packages/database/migrations/0002_chat.sql` adds `conversations`/`messages` tables
      (scoped to just this milestone, same "first-pass tables only" rule `0001_init.sql`
      followed — skills/connections get their own migration when M23/M24 start). **Leonardo
      needs to run this migration in the Supabase SQL editor** (same as M7) before Chat
      persistence actually works against the real project — until then it silently falls back
      to `LocalStore`, same honest fallback `getStore()` already does. New
      `useCurrentConversation` hook (mirrors `useActiveProject`'s localStorage-id pattern)
      lazily creates/resolves one ongoing conversation; `App.tsx`'s `handleCommand` now persists
      every user/Jarvis exchange into it, fire-and-forget so persistence failure can't block a
      command that already succeeded. Dashboard's Command Log UI is unchanged on purpose — a
      real Chat view reading full history is Milestone 22, not this one. 5 new `localStore.test.ts`
      tests (46 total, up from 41 — some earlier counts in this file undercounted since they
      only tracked `commandEngine.test.ts`). `tsc -b`, `npm run test`, `vite build` all clean.
      Not yet seen live (needs the migration run + a real click-through).
- [ ] 2026-08-11 — **Chat + Memory + Skills + Connections upgrade — plan written 2026-08-11,
      M21 now started per above.** He asked for a chat tab, memory
      tab, and skills tab (spec pasted from ChatGPT) instead of one-shot orders JARVIS doesn't
      remember. Per the spec's own instruction ("do not begin implementing before the plan is
      shown"), inspected the current V1 implementation first (`commandEngine.ts`,
      `permissions.ts`, `AGENT_SYSTEM.md`, `MCP_SETUP.md`, `0001_init.sql`, `Sidebar.tsx`,
      `App.tsx`, `DashboardView.tsx`, `MemoryView.tsx`) and wrote the full structured plan at
      `CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md` — see that file for CURRENT V1 STATE / REUSABLE
      COMPONENTS / REQUIRED CHANGES / DATABASE CHANGES / OBSIDIAN CHANGES / UI CHANGES / VOICE
      CHANGES / SECURITY CONSIDERATIONS / proposed Milestones 21–29. Key finding: most of what
      the spec asks for is an extension of things that already exist, not new systems — Skills
      are the existing prompt-template commands given a data row instead of a hardcoded switch
      case, Connections are a UI layer over auth that's already live (Calendar/Gmail/GitHub/
      Obsidian/Supabase), Chat is `App.tsx`'s ephemeral 6-entry log made persistent. Real new
      work: `conversations`/`messages`/`skills`/`connections` tables (new migration, Leonardo
      runs the SQL himself same as M7), and Memory's index (M27) needs actual filesystem
      scanning — likely `cargo`/Rust, handed to local Claude Code when that milestone starts.
      **Nothing implemented yet** — see the plan doc's "Awaiting approval" section.
- [x] 2026-08-10 — **Fixed and live-confirmed: JARVIS talking in a loop / reporting things
      Leonardo never said.** Root cause: `wait_while_speaking()` in `listen_loop.py` only ran
      once, before opening the mic stream for wake-word listening — once inside that stream,
      nothing re-checked `speaking.flag` for as long as the stream stayed open, so JARVIS's own
      TTS output could false-trigger its own wake word, get recorded and transcribed back as a
      fake command, and loop indefinitely. Fixed by checking `speaking.flag` inside
      `wake_callback` itself (runs per ~80ms audio chunk, not once per stream). Also widened
      `speak_daemon.py`'s post-playback tail from 0.4s to 1.2s (echo/Bluetooth-buffer margin).
      Leonardo confirmed live after restarting the voice listener: **"the voice is perfect."**
      Milestone 9 is now fully closed, no open voice bugs.
- [ ] **Coordination note:** this repo is being edited by two Claude sessions (this Cowork
      session and your local Claude Code in Terminal) — both have made real progress
      independently (repo relocation + Rust build by local Claude Code; Milestone 6 by Cowork).
      No conflicts so far, but let one finish a logical chunk before the other edits again.
- [x] 2026-08-10 — **Voice fully confirmed live end-to-end.** Said "Hey Jarvis" for real from a
      normal Terminal window (not an assistant's sandbox, which genuinely cannot reach
      CoreAudio): wake word detected, recorded, transcribed, routed through `commandEngine.ts`,
      spoken back. Five real bugs found and fixed along the way — see `VOICE_SETUP.md`'s
      "Confirmed live" section for the full list (missing capabilities file, float32 JSON bug,
      wake-phrase-inclusive transcripts, duplicate event listener, and a feedback loop where
      JARVIS heard its own replies). 17 Rust + 35 frontend tests passing at that point.
- [x] 2026-08-10 — **Fixed: JARVIS wasn't asking Claude anything outside 9 fixed commands.**
      Reported live by Leonardo. Root cause: `commandEngine.ts`'s `parseCommand` had zero general
      fallback — anything not matching a rigid pattern (switch-theme/status/help/research/
      continue-project/check-calendar/check-email/check-github/delete-project) hit a hardcoded
      "Not implemented yet" and never reached the orchestrator. Added a new `ask` command kind:
      unrecognized input now routes through the orchestrator as a direct message, with the
      prompt explicitly told to describe rather than take action for anything consequential
      (this command bar/voice path has no approval-dialog surface). Level 1 in `permissions.ts`.
      5 new tests, 38 total passing. `tsc -b`/`vite build` verified.
- [ ] Optional, not blocking: if Leonardo upgrades his ElevenLabs plan, switch `config.json`'s
      `tts_engine` from `macos_say` to `elevenlabs` for higher-quality voice output (the
      "Jon - Calm Presence" voice ID is already saved and ready).
- [ ] **Activate the morning brief launchd job**, if you want it running automatically —
      commands are in `packages/automations/launchd/README.md`. Still deliberately not run by
      Claude, even under a blanket "always allow" grant (2026-08-09): that README states the
      reasoning explicitly — a recurring job that writes to your vault should start because you
      turned it on, not because an assistant decided it should run. 3 lines, your terminal.
- [x] 2026-08-10 — **First real live click-through, via screenshots Leonardo sent from the actual
      running app.** Findings: (1) the `ask` fallback works well live — "Thank you very much" got
      a real conversational reply, and a mis-phrased "continue with Ape War Game project" (doesn't
      match `continue-project`'s strict "continue project <name>" pattern) correctly fell through
      to `ask`, which found the real `~/Unity/Ape War` project on disk and asked for confirmation
      instead of guessing — exactly the safe behavior it was designed for. (2) `check-calendar`/
      `check-email` ARE reaching the orchestrator correctly, but both hit a real MCP permission
      wall: `.claude/settings.local.json` only had `list_calendars`/`list_labels` pre-approved
      from earlier interactive testing, not the tools actually needed to read events/messages
      (confirmed live: the Gmail failure named `mcp__claude_ai_Gmail__search_threads` exactly).
      Added `search_threads`/`get_thread`/`get_message` (Gmail, confirmed names) and
      `list_events`/`search_events`/`get_event` (Calendar, informed guess based on typical
      naming — NOT confirmed, needs retest) to the gitignored settings file. (3) `check-github`
      and `continue-project` still aren't actually verified — Leonardo's phrasing ("Check my git
      hub", "continue with Ape War Game project") didn't match either command's strict pattern, so
      both silently fell through to `ask` instead, which handled them gracefully but means the
      dedicated command paths are still unexercised. Retry needed with the exact phrases: "check
      my github" and "continue project Ape War".
- [x] 2026-08-10 — **M7 (Supabase), M14 (Calendar), M15 (Email) all confirmed live**, via
      screenshots from the actual running app. `check my calendar` returned a real, correct
      "completely clear Aug 10–12" result. `check my email` returned a real, detailed inbox
      summary (~201 unread, mostly promotional, one real item worth a look — a GitHub
      unrecognized-location sign-in alert from 2026-08-09 coinciding with the new Supabase OAuth
      app authorization; flagged to Leonardo to confirm that was him, not treated as a security
      incident since it lines up with his own actions that day). Confirms the Gmail/Calendar MCP
      permission fix from the previous entry worked, including the guessed Calendar tool names.
      Projects view: created a real project ("Ape War Game") that persisted and displays with a
      Status/Created/Delete card — `SupabaseStore` confirmed working end-to-end from the actual
      UI, not just direct REST calls. `check my github` still not verified — typed as "check my
      git hub" (with a space) again, which doesn't match the command's `github` (no space)
      pattern, so it fell through to `ask` again (which behaved safely, asking what kind of
      GitHub info was wanted rather than guessing). Still need: exact phrase "check my github",
      and "continue project Ape War Game" (matching the real created project name) for M10.
- [x] 2026-08-11 — **M19 performance benchmarking: real numbers collected.** Leonardo ran
      `scripts/benchmark_orchestrator.sh` for real (3 runs each). Results:
      research 15s/15s/15s (avg 15s, $0.04–$0.21); check-calendar 12s/13s/14s (avg 13s,
      $0.09–$0.13); check-email 17s/19s/16s (avg 17s, $0.14–$0.18); check-github 25s/25s/**44s**
      (avg 31s, $0.10–$0.24 — notably more variance than the others, one run 76% slower);
      continue-project background launch 1s/1s/1s (consistently fast), done-after 13s/5s/6s
      (first run slower, likely a cold-start effect matching the cost decline seen in `research`
      across its own 3 runs, probably prompt-cache warmup).
      **Real finding, not just a number:** every synchronous command takes 12–44 seconds. That's
      a long silent wait for a command-bar/voice interaction with no incremental feedback today —
      `App.tsx` shows a "processing" core-state animation for typed input, but a voice command
      like "check my github" going quiet for up to 44 seconds before JARVIS speaks could easily
      read as broken rather than working. Worth a real UX pass (progress indication, or an
      earlier "still checking..." interim reply) before calling M19/M20 done — not filed as a
      separate milestone since it's really a V1-polish-level finding, logged here so it isn't
      lost. check-github's specific 44s outlier is also worth a second batch to see if it's
      consistent or a one-off (rate limiting, more repos to check that run, etc.) before assuming
      it's just normal variance. Raw output: `benchmark_results_20260811_100102.md` (gitignored,
      local only — numbers summarized here instead of committing timestamped raw files).
- [x] 2026-08-11 — **Two real gaps found in the benchmark/roadmap review closed, both frontend-only
      (no cargo needed):**
      (1) Every synchronous orchestrator command measured 12–44s live with zero feedback beyond
      the core animation. `App.tsx`'s `handleCommand` now starts a 6s timer for any
      orchestrator-routed command kind; if it fires before the real response lands, an interim
      "Still working on that…" line appears above the Command Log, cleared the moment the actual
      response arrives. Doesn't touch `continue-project`'s background path (already fast, ~1s,
      already has its own immediate feedback).
      (2) M16's named gap — research findings never linked to a specific project, and the
      Dashboard's "Active Project" panel was hardcoded dead text, not backed by any real state.
      Added `useActiveProject` (localStorage-persisted selection, same pattern as
      `useTheme`/`useVoiceSettings`), a "Set Active"/"Active" control per project card in
      `ProjectsView`, and real Dashboard display. `research <topic>`'s orchestrator prompt now
      mentions the active project by name when one is set (via a new
      `CommandContext.activeProject` field), asking Claude to note it in both the saved note and
      the reply — a real, working link without inventing new folder-structure conventions.
      Deleting the active project correctly clears the selection instead of leaving it dangling.
      2 new commandEngine tests (40 total, up from 38), `tsc -b`/`vite build` both clean.
- [x] 2026-08-11 — **`check my github` fixed and confirmed live — M12 fully done.** First live
      attempt with the exact phrase found a real, different permission gap than Calendar/Email
      (a Bash-permission wall, not MCP-tool): the orchestrator's headless `claude -p` tried to
      run `gh` directly and got refused with a clear, honest error ("This session doesn't have
      permission to run `gh` commands, and since it's non-interactive there's no one to approve
      the prompt"), even naming the exact commands it wanted to run. `.claude/settings.local.json`
      only had `gh auth *`/`gh repo *` pre-approved; added `gh search prs/issues *`,
      `gh pr list/status/view *`, `gh issue list/view *`, `gh notifications*` — deliberately no
      `gh *` wildcard, so write subcommands stay unapproved. Retested: "check my github" returned
      a real, correct result ("No open PRs or issues assigned to you... GitHub is clear right
      now"). Every orchestrator-routed command except `continue-project` is now confirmed live.
- [x] 2026-08-11 — **Obsidian linked into the app — the gap Leonardo named directly ("everything
      works, only obsidian isn't linked").** New `check-memory` command (`commandEngine.ts`): typed
      "check my memory"/"check my notes", spoken the same way, or a button in a new `MemoryView`
      (replacing the Memory sidebar section's `NotBuiltView` placeholder) all ask the
      orchestrator's `claude` to read `~/Documents/Obsidian Vault`'s Daily/Inbox/Notes folders and
      summarize what's there — same no-new-Rust pattern as check-calendar/check-email/check-github,
      since `claude` already has direct filesystem access to the vault through its own tools.
      `StatusPanel`'s Obsidian row moved off its hardcoded "not-wired" onto the same dynamic
      unverified/not-wired logic the other systems use. While auditing that panel, also caught
      that Claude/Voice/GitHub/Supabase had all been live-confirmed this session but were still
      showing "WIRED, UNVERIFIED" instead of "CONNECTED" — the panel was designed to need a manual
      flip once confirmed (see its own comment) and that flip never happened until now. Fixed all
      four. 2 new commandEngine tests (42 total, up from 40), `tsc -b`/`vite build` both clean.
      Not yet seen live in the running app — same "verified by tests, not by eyes yet" gap as the
      other frontend-only work today.
- [ ] **Last command still needing live confirmation with its exact phrasing:**
      **"continue project Ape War Game"** (matching the real project name, not "continue
      with..." — anything else falls through to the safer but non-dedicated `ask` path). Takes
      the background path — expect an immediate "started as a background job" reply, then a
      second Command Log entry once it finishes. Once this lands, every command in M10-M18 is
      genuinely confirmed live and M20 (V1 polish) has nothing left blocking it from starting.
- [ ] **`orchestrator.rs`'s bundled-app `PATH` resolution gap, plus two other cargo/live-window
      items, hand off written 2026-08-11:** see `HANDOFF_PATH_FIX_AND_VERIFICATION.md` — covers
      the known `PATH` limitation (works under `cargo tauri dev`, would silently fail in a
      double-clicked bundled app), re-running `check-github`'s benchmark to see if its 44s outlier
      repeats, and live-screenshotting the active-project-selection + interim-feedback frontend
      changes from the same date. For local Claude Code to pick up — none of it needs Leonardo
      specifically, per his "cover as much as possible while I'm away" instruction.

## Done

- [x] 2026-08-09 — Repo scaffolded: directory structure, `.gitignore`, git initialized.
- [x] 2026-08-09 — `ARCHITECTURE.md` written with corrected Cowork/local-Claude-Code runtime split.
- [x] 2026-08-09 — `ROADMAP.md` mapped to 20 milestones with honest status.
- [x] 2026-08-09 — Docs skeleton (`SECURITY.md`, `INSTALLATION.md`, and 10 subsystem docs) written,
      each stating current status rather than pretending completion.
- [x] 2026-08-09 — Milestone 1 (system inspection) run locally, report saved to
      `~/Documents/Obsidian Vault/System/SYSTEM_INSPECTION_REPORT.md`.
- [x] 2026-08-09 — Vault path confirmed as `~/Documents/Obsidian Vault` (not
      `/Users/leonardo/obsidian`, which is empty); `OBSIDIAN_SETUP.md` and `ARCHITECTURE.md`
      corrected accordingly.
- [x] 2026-08-09 — Stack decided from real hardware/disk data: Tauri, Supabase Cloud,
      launchd/cron instead of n8n initially, local Claude Code confirmed as orchestrator.
- [x] 2026-08-09 — Frontend scaffold built: Vite+React+TS, 4-theme token system, animated
      `JarvisCore` (10 states), sidebar nav shell, disabled command bar, honest "not wired yet"
      status panel. `npm run build` verified passing.
- [x] 2026-08-09 — Tauri backend config written (`Cargo.toml`, `tauri.conf.json`, `main.rs`).
      Local Claude Code then fixed two issues (redundant `[lib]` block, relative frontend
      paths), generated real app icons, and compiled it — `target/debug/jarvis` is a genuine
      Mach-O arm64 binary. Milestone 3 build is verified; visual launch still isn't.
- [x] 2026-08-09 — Repo relocated by local Claude Code to `~/Developer/jarvis`, out of the
      Cowork session artifacts folder.
- [x] 2026-08-09 — Milestone 6 (Obsidian memory) built for real in `~/Documents/Obsidian
      Vault`: `JARVIS.md`, `System/memory.md`, `System/scripts/{what_open,connect_this,
      orphan_scan}.py`, and `Inbox/`/`Daily/`/`Notes/`/`Briefs/` populated with real seed
      content. All 3 scripts run-tested against that content before being marked done.
- [x] 2026-08-09 — Milestone 5 (command engine) built: `commandEngine.ts` parses text into a
      typed `Command`, `executeCommand` runs it. 5 unit tests pass (`npm run test`). Wired into
      the now-enabled `CommandBar` and `App.tsx`, with a live command log. `tsc -b` and
      `vite build` both verified passing.
- [x] 2026-08-09 — Milestone 9 (voice) partially built. Stack decided and documented in
      `VOICE_SETUP.md`. 3 Python scripts written and syntax-checked (not run — no audio hardware
      available). Frontend `VoiceSettings` panel built: real device enumeration, real permission
      status, persisted toggles — `npm run test`/`build` both verified passing.
- [x] 2026-08-09 — Milestone 7 (Supabase) code written: client, store implementation, migration
      SQL. No project provisioned yet (needs you — see "Now" above).
- [x] 2026-08-09 — Milestone 8 (Projects + Tasks) built: real CRUD views backed by a local-
      storage adapter matching the Supabase schema exactly. Sidebar nav now actually routes
      between views. 11 tests passing, build verified.
- [x] 2026-08-09 — Milestone 13 (automations) built: `morning_brief.py` written and run
      successfully against the real vault (not just syntax-checked) — produced a correct
      `Briefs/2026-08-09.md`. `launchd` plist + activation README written; not loaded (needs your
      `launchctl` command, on principle). Corrected `AUTOMATIONS.md`'s inaccurate claim that a
      Cowork scheduled task already handled this.
- [x] 2026-08-09 — Milestones 10, 11, 12, 14, 15, 16, 17, 19, 20: honest architecture pass.
      `ROADMAP.md` updated with real design decisions and specific blockers for each instead of
      "Not started" with no explanation. Notably corrected `MCP_SETUP.md`: Calendar and Gmail
      MCP connectors are already connected at the Cowork account level (checked directly,
      2026-08-09) — the real blocker for M14/M15 is that Cowork's connectors don't transfer to
      the local runtime that will actually run as JARVIS, not that you still need to authorize
      anything. `TESTING.md` updated with an actual coverage summary instead of an empty test
      plan. No new application code — building routing/integration code against a local
      orchestrator process that doesn't exist yet (M10/M11/M16/M17) would be untestable and
      would repeat the exact "renders but isn't connected" mistake the spec warns against.
- [x] 2026-08-09 — Fixed the `npm audit` findings in `apps/desktop/frontend`. Turned out to be
      worse than previously noted (esbuild moderate + vite high path-traversal + vitest
      **critical** UI-server arbitrary file read, all dev-only). `npm audit fix --force` bumped
      vitest `^2.1.8` → `^4.1.10` (vite stayed `^6.0.3`). Re-verified after the bump rather than
      trusting the audit output alone: 16 tests still pass, `tsc -b` and `vite build` both still
      pass. `npm audit` now reports 0 vulnerabilities.
- [x] 2026-08-09 — Milestone 3 launch confirmed: `cargo tauri dev` compiled and ran for real (not
      just the earlier `cargo build`) — frontend served by Vite on `:1420`, backend compiled in
      2.79s, `target/debug/jarvis` process came up and to the foreground (confirmed via
      `osascript`/process list). No screen-recording permission in the driving session to grab a
      screenshot and check it pixel-for-pixel — Leonardo was at the same machine for the voice
      script tests right after, so worth a quick explicit "does it look right?" from him if that
      hasn't happened yet, but the process-level launch itself is verified.
- [x] 2026-08-09 — Voice scripts: dependencies installed into a local `.venv` in
      `System/voice/` (`uv venv` + `uv pip install -r requirements.txt`, 36 packages, isolated
      from system Python). `transcribe.py` confirmed working end-to-end by Leonardo running it
      himself (mic → faster-whisper `small` → correct transcript "Hello."). Diagnosed along the
      way: driving the script via an assistant's tool calls can't synchronize with real-time
      speech (no live terminal the user is watching), which looked like a mic/permission bug
      through several rounds of debugging (checked Terminal's mic permission, input volume,
      System Settings' input level meter — all fine) before landing on the real cause. Lesson for
      next time: for anything needing real-time human I/O, hand the exact command to the user
      first instead of iterating blind.
- [x] 2026-08-09 — Spot-checked `~/Desktop/Jarvis.app` (no longer present — nothing to collide
      with), `~/plugins/jarvis` (unrelated Codex plugin directory — `.codex-plugin/`, `assets/`,
      `scripts/`, `skills/` — no bundle id overlap), and `~/.Trash` (no `jarvis-desktop`
      remnants found). No collision risk with `dev.leonardo.jarvis`.
- [x] 2026-08-09 — Milestone 12 (GitHub) read-only test: `gh auth status` confirms real, active
      HTTPS auth (`Leo1511-byte`, scopes `gist`/`read:org`/`repo`/`workflow`) — matches the
      system inspection. This repo itself has no remote configured yet (`gh repo view` → "no git
      remotes found"), which is expected, not a bug.
- [x] 2026-08-09 — **Correction to Milestone 14/15's stated blocker:** tested
      `list_calendars`/`list_labels` directly from this local Claude Code session (not Cowork)
      and both returned real data (2 calendars incl. `leonardolundsendino@gmail.com`; real Gmail
      label counts, e.g. 1040 INBOX messages). The Calendar/Gmail MCP connectors are already
      configured and working in the local runtime — the earlier "doesn't carry over from Cowork"
      blocker no longer holds. `MCP_SETUP.md` corrected. Remaining gap for M14/M15 is wiring
      this into the desktop app via the M10 orchestrator, not MCP configuration.
- [x] 2026-08-09 — **Milestone 10, first real slice**: `apps/desktop/backend/src/orchestrator.rs`
      adds `run_orchestrator`, a Tauri command that shells out to the local `claude` CLI
      (`claude -p --output-format json`) — verified by hand first (`claude -p "..."
      --output-format json` really does return clean `{result, session_id, ...}` JSON; also
      tried `claude --bg` + `claude agents --json` for a possible background-mode path, parked
      for a future slice — see "Now"). Wired into `commandEngine.ts` as a new `research <topic>`
      command, injected via `CommandContext.runOrchestrator` so the engine stays testable without
      Tauri. `executeCommand` is now `async`; `App.tsx` provides the real `invoke("run_orchestrator",
      ...)` implementation. 3 new Rust unit tests (JSON parsing, error surfacing, malformed-output
      handling) + 4 new frontend tests (parsing, successful routing, orchestrator error, no-ctx
      case). `cargo test`, `npm run test`, `tsc -b`, `vite build` all verified; the running
      `cargo tauri dev` picked up every change via hot reload without errors. Scoped deliberately
      narrow (one command, sync-only) rather than building all of M10/11/16/17's routing at once.
- [x] 2026-08-09 — Fixed a real, previously-uncaught test regression: `npm run test` was
      silently broken since the vitest 2→4 bump (`5e2d7f9`) — Node 25's experimental native
      `localStorage` (on by default) shadowed jsdom's, failing 6 `localStore.test.ts` tests with
      `localStorage.clear is not a function`. `TASKS.md`'s prior entry for that commit claiming
      "16 tests still pass" was wrong. Fixed via `NODE_OPTIONS=--no-experimental-webstorage` in
      the `test` script. All 20 tests pass now (16 prior + 4 new from the M10 slice above).
- [x] 2026-08-09 — Committed local Claude Code's uncommitted M10 slice + real verification work
      (`dd3bb38`) after independently re-running the frontend side myself (fresh `npm install`,
      20/20 tests with the `NODE_OPTIONS` fix, `tsc -b`, `vite build`) — didn't just trust the
      docs' claims. Added `.claude/settings.local.json` to `.gitignore` (machine-specific
      permission grants, not shared config) so it doesn't get committed by either session.
- [x] 2026-08-09 — Milestones 11, 14, 15, 16 (17 reframed): three more command-bar intents added
      to `commandEngine.ts` (`continue-project`, `check-calendar`, `check-email`), all reusing the
      existing `run_orchestrator` Tauri command with different prompts — zero new Rust needed,
      since M10 already built a generic-enough interface. `permissions.ts` classifies
      research/calendar/email as Level 1 (explicitly read-only prompts) and continue-project as
      Level 2 (writes, but traceable via git history + session id, not gated per-action). 9 new
      tests (4 parsing + 5 execution) — 29 total passing. `AGENT_SYSTEM.md` rewritten to describe
      "specialists" honestly as prompt templates over one orchestrator call rather than separate
      agent processes, which is what M17 actually turned out to need. `COMMANDS.md`, `ROADMAP.md`
      updated to match. `tsc -b`/`vite build` verified.
- [x] 2026-08-09 — Milestone 12 (GitHub) closed the same way: `check my github` / `check my prs` /
      `check my pull requests` / `check my issues` route through the orchestrator with a prompt
      telling the local `claude` CLI to use its already-authenticated `gh` command directly — no
      GitHub MCP server needed, since the orchestrator's `claude` process already has bash/tool
      access. Level 1, explicitly read-only. 4 more tests (2 parsing + 2 execution, one asserting
      the prompt mentions both "Read-only" and "gh") — 31 total passing. `tsc -b`/`vite build`
      verified.
- [x] 2026-08-09 — Milestone 18 (permissions + approval) built: `permissions.ts` classifies
      command kinds by level, `ApprovalDialog` + `useApproval` implement a real, promise-based
      Level 3 approval flow (spec §55 format), wired into `ProjectsView`'s new Delete button —
      the store's `deleteProject` (both `localStore` and `supabaseStore`) is only called after
      the user clicks Approve. `commandEngine.ts` recognizes `delete project <name>` but
      deliberately does not execute it from the command bar, since a typed/spoken command has no
      real confirmation surface — it redirects to the UI instead of faking one. 16 tests passing
      (`npm run test`), `tsc -b` and `vite build` both verified.

- [x] 2026-08-10 — **Milestone 9 (voice) fully confirmed live**, closing out the last real gap.
      `wake_listener.py`: two real bugs found and fixed via live user testing — openWakeWord's
      default `tflite` backend has no reliable Apple Silicon wheel (switched to
      `inference_framework="onnx"` + added `onnxruntime` to `requirements.txt`), and the pip
      package doesn't bundle the actual model weight files (added an automatic
      `download_models()` call before `Model()` init). Detected "Hey Jarvis" live, score 0.92.
      `speak_daemon.py`: went through an API-key mixup (Key ID pasted instead of the actual
      `sk_`-prefixed key), then a stale-daemon-process bug (config is only read at startup, so
      fixing the key file didn't help until the process was restarted), then discovered
      ElevenLabs' free API tier blocks TTS generation entirely regardless of voice — confirmed
      via web search and hit live with both a Voice Library voice and a premade voice, both 402
      `paid_plan_required`. Rewrote `speak_daemon.py` to support two engines via `config.json`'s
      new `tts_engine` key: `macos_say` (default — free, offline, macOS's built-in `say`, no key
      needed) and `elevenlabs` (kept intact for once the plan is upgraded). Confirmed working —
      Leonardo heard real audio. `transcribe.py` was already confirmed in a prior session.

- [x] 2026-08-10 — **Milestone 7 (Supabase) fully done.** Leonardo created the real project
      (`Leo1511-byte's Project`, free tier, AWS eu-central-1, ref `nriarfrgmjsygswlweed`). Ran
      the migration in the Supabase SQL editor via the Claude in Chrome extension (pasted via
      clipboard to avoid the Monaco editor's auto-bracket-closing mangling typed SQL) — "Success.
      No rows returned", all 5 tables + RLS policies created, confirmed by the "Untitled query"
      now showing under Private queries. Copied the real Project URL and legacy `anon` public key
      (safe for client-side use by design) from Settings → API Keys and filled in
      `apps/desktop/frontend/.env.local`.

- [x] 2026-08-10 — **Voice crash-recovery gap fixed** (found by the Cowork-side session
      without `cargo`, handed off via `HANDOFF_VOICE_CRASH_RECOVERY.md`, picked up and fixed by
      local Claude Code): `listen_loop.py`'s per-cycle work is now wrapped in broad exception
      handling — logs the traceback, emits `{"event":"error"}`, backs off 1s, and keeps looping
      instead of the whole process dying. `voice.rs` gained a per-process monitor thread (one
      for the listener, one for the speak daemon) that polls `Child::try_wait()` every 2s; if a
      child exited without an explicit stop call, it clears the stale handle and auto-restarts
      with linear backoff, capped at 5 attempts before giving up and saying so. A new `Status`
      voice-event reports "crashed, restarting" / "reconnected" / "gave up" to the Command Log
      instead of voice just going silently dark. 2 new Rust tests (`parses_a_status_event`,
      `backoff_grows_then_caps_at_four_times_base`) — 22 Rust total, 38 frontend (unchanged),
      all passing. Not independently re-verified live (would need to actually crash the process
      mid-session) — the fix follows the exact mechanism `HANDOFF_VOICE_CRASH_RECOVERY.md`
      described and reuses the existing spawn/event-parsing code already confirmed live.

## Blocked

(none currently — Milestone 7's Supabase account/project blocker was resolved 2026-08-10)

## Backlog (unscoped, from the original spec — do not start yet)

Desktop UI, theme system, wake word, Supabase schema rollout, GitHub write actions, n8n
workflows, calendar/email integration, specialist agent routing, permission/approval UI. Each
gets its own entry here once its milestone is actually starting, per "avoid building dozens of
unfinished features at once."
