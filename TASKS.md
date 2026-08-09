# Tasks

## Now

- [ ] **Coordination note:** this repo is being edited by two Claude sessions (this Cowork
      session and your local Claude Code in Terminal) — both have made real progress
      independently (repo relocation + Rust build by local Claude Code; Milestone 6 by Cowork).
      No conflicts so far, but let one finish a logical chunk before the other edits again.
- [ ] **Run the remaining 2 voice scripts for real**: `wake_listener.py` (say "Hey Jarvis",
      confirm `WAKE WORD DETECTED`) still needs a live run — `transcribe.py` is confirmed
      (below). `speak_daemon.py` is blocked: `config.json`'s `elevenlabs_api_key` is still empty
      (checked programmatically without printing it — length 0) even though `elevenlabs_voice_id`
      is filled in. Add the real key, then retest.
- [ ] Once `wake_listener.py`/`speak_daemon.py` are confirmed: wire all 3 scripts into the Tauri
      app as sidecar processes, and feed `transcribe.py`'s output into the same
      `commandEngine.ts` the command bar uses.
- [ ] **Create the actual Supabase project** (`INSTALLATION.md` step 3) — the code's ready and
      waiting, only account creation is left, and that has to be you.
- [ ] **Activate the morning brief launchd job**, if you want it running automatically —
      commands are in `packages/automations/launchd/README.md`. Still deliberately not run by
      Claude, even under a blanket "always allow" grant (2026-08-09): that README states the
      reasoning explicitly — a recurring job that writes to your vault should start because you
      turned it on, not because an assistant decided it should run. 3 lines, your terminal.
- [ ] **Test all five orchestrator-routed commands in the actual running app** — `research
      <topic>`, `continue project <name>`, `check my calendar`, `check my email`, `check my
      github` — type each into the real command bar in the `cargo tauri dev` window and confirm
      you get a real result back (not just the automated tests, which mock the Tauri IPC
      boundary). Nobody has clicked through any of the four added 2026-08-09 yet.
- [ ] **Background-mode path for the orchestrator** — every command today (`research`,
      `continue-project`, `check-calendar`, `check-email`) blocks the command bar's `processing`
      state until the whole synchronous `claude -p` call finishes. Fine for quick reads, wrong
      for `continue project`'s full spec §62 workflow on a big task. `claude --bg` + polling
      `claude agents --json` were verified callable by hand but not built into `orchestrator.rs` —
      scope as its own slice, not sync-mode's problem to solve.
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

## Blocked

- Milestone 7's Supabase project: blocked on you creating an account (Claude doesn't create
  accounts on your behalf).
- Milestone 9's `speak_daemon.py`: blocked on adding a real key to `config.json`'s
  `elevenlabs_api_key` (still empty as of 2026-08-09) — the file exists and the voice ID is set,
  only the key itself is missing, and that's the one thing that shouldn't be typed into any
  Claude chat.

## Backlog (unscoped, from the original spec — do not start yet)

Desktop UI, theme system, wake word, Supabase schema rollout, GitHub write actions, n8n
workflows, calendar/email integration, specialist agent routing, permission/approval UI. Each
gets its own entry here once its milestone is actually starting, per "avoid building dozens of
unfinished features at once."
