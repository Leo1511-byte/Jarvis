# Tasks

## Now

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
- [ ] **Last step for Supabase writes — needs you at the actual window:** local Claude Code
      relaunched `cargo tauri dev` clean (2026-08-10) and confirmed via direct REST calls that
      `SupabaseStore`'s exact insert/select/delete queries all work against the real `projects`
      table (RLS + anon key both correct) — see `ROADMAP.md` M7. What's left is purely the
      click-through: this session has no WindowServer/screen access to do it itself. The dev
      window should already be open — type a name into Projects, click Add, and check it shows
      up in Supabase's table editor. Should take 10 seconds if the backend proof above holds.
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
- [ ] **M19 performance benchmarking started:** `scripts/benchmark_orchestrator.sh` written and
      committed — times all 5 orchestrator commands (the 4 synchronous ones + continue-project's
      background launch-to-done plumbing) by calling `claude` directly with the exact prompts
      `commandEngine.ts` sends, since `orchestrator.rs`'s Rust wrapper only adds negligible
      process-spawn overhead on top of that call. Can't be run from the Cowork sandbox that wrote
      it — needs the same authenticated `claude` + locally-configured Calendar/Gmail MCP servers
      that live on Leonardo's machine, or numbers wouldn't be representative. Parsing logic
      (job-id extraction, JSON field extraction, agents-state lookup) unit-tested by hand against
      the same real fixture data `orchestrator.rs`'s own Rust tests use (`REAL_BG_LAUNCH_OUTPUT`,
      `REAL_AGENTS_JSON`) — all three matched correctly. Run with `bash
      scripts/benchmark_orchestrator.sh` from the repo root; writes a timestamped
      `benchmark_results_*.md`. Still needed: an actual run producing real numbers, and app
      startup timing (deferred — that's really about the bundled release build, which isn't
      testable yet per the known PATH-resolution gap in `orchestrator.rs`).
- [ ] **Test all five orchestrator-routed commands in the actual running app** — `research
      <topic>`, `continue project <name>`, `check my calendar`, `check my email`, `check my
      github` — type each into the real command bar in the `cargo tauri dev` window and confirm
      you get a real result back (not just the automated tests, which mock the Tauri IPC
      boundary). Nobody has clicked through any of the four added 2026-08-09 yet. `continue
      project` now takes the background path (see below) — expect an immediate "started as a
      background job" response, then a second Command Log entry a bit later with the real result.
- [ ] **Last step for background mode — needs you at the actual window:** local Claude Code
      built the background-mode path for `continue-project` (2026-08-10) — see `AGENT_SYSTEM.md`
      and `ROADMAP.md` M10. The underlying `claude --bg`/`claude agents --json --all`/fork-resume
      sequence was verified by hand in a terminal with a real trivial background job (launch →
      poll → fetch result → stop, all confirmed working), and 10 new Rust unit tests cover the
      parsing logic using that real captured output as fixtures — 20 Rust tests total, all
      passing, `cargo tauri dev` hot-reloads clean. What's not verified is clicking `continue
      project <name>` in the actual live window and watching both Command Log entries appear —
      same WindowServer-access gap as the Supabase/voice items above.
- [ ] Known limitation in `orchestrator.rs`: `claude` is resolved via `PATH`, which works under
      `cargo tauri dev` (inherits Terminal's env) but will silently fail in a double-clicked,
      bundled app (Finder-launched processes get a minimal PATH). Not fixed yet — fix when the
      bundled build is actually being tested, not before.

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
