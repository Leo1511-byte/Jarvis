# Tasks

## Now

- [ ] **Coordination note:** this repo is being edited by two Claude sessions (this Cowork
      session and your local Claude Code in Terminal) — both have made real progress
      independently (repo relocation + Rust build by local Claude Code; Milestone 6 by Cowork).
      No conflicts so far, but let one finish a logical chunk before the other edits again.
- [ ] Run `cargo tauri dev` yourself at least once to see the actual window open — it's compiled
      (`apps/desktop/backend/target/debug/jarvis` exists and runs), but nobody has visually
      confirmed the app launches and looks right yet.
- [ ] Spot-check `~/Desktop/Jarvis.app` (confirmed: unrelated third-party iOS chat app,
      bundle id `jarvis.ios`), `~/plugins/jarvis`, and the `jarvis-desktop` remnants in
      `~/.Trash` for anything that could collide with this app's bundle id
      (`dev.leonardo.jarvis`).
- [ ] Milestone 5 shipped with only 2 real actions (theme switch, status). Extending it further
      means building the backend each new command needs first — resist adding command phrases
      that "help" would list but that don't actually do anything (spec principle #6).
- [ ] **Run the 3 voice scripts for real** (`~/Documents/Obsidian Vault/System/voice/README.md`)
      — `uv pip install -r requirements.txt`, copy `config.example.json` to `config.json` with
      your ElevenLabs key, then test `wake_listener.py`, `transcribe.py`, `speak_daemon.py`
      individually. None of them have been run yet, only syntax-checked.
- [ ] Once the scripts work standalone: wire them into the Tauri app as sidecar processes, and
      feed `transcribe.py`'s output into the same `commandEngine.ts` the command bar uses.
- [ ] `npm audit` flags a moderate-severity esbuild advisory in the vitest/vite dev toolchain
      (dev-server only, not shipped in the production build). Not fixed yet — would need a
      vitest major-version bump. Low priority but noted rather than ignored.
- [ ] **Create the actual Supabase project** (`INSTALLATION.md` step 3) — the code's ready and
      waiting, only account creation is left, and that has to be you.
- [ ] **Activate the morning brief launchd job**, if you want it running automatically — see
      `packages/automations/launchd/README.md`. Not done automatically on purpose.
- [ ] **Milestone 10/11/16/17 all need a local orchestrator process first** — that's local
      Claude Code (or the Agent SDK) actually running as JARVIS, invokable from the desktop app.
      This is the single biggest real blocker left; four milestones unlock once it exists.
- [ ] **Milestone 14/15 (Calendar/Gmail):** configure equivalent MCP servers in your local Claude
      Code config — Cowork already has working Calendar/Gmail connectors, but that access is
      Cowork-session-scoped and doesn't carry over. See `MCP_SETUP.md`.
- [ ] **Milestone 12 (GitHub):** local git/GitHub auth is already set up over HTTPS per the
      system inspection — worth testing a minimal read-only `gh` call locally before building
      anything, to confirm the auth actually works end to end.

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
- Milestone 3's visual confirmation: blocked on you actually running `cargo tauri dev` and
  looking at the window.

## Backlog (unscoped, from the original spec — do not start yet)

Desktop UI, theme system, wake word, Supabase schema rollout, GitHub write actions, n8n
workflows, calendar/email integration, specialist agent routing, permission/approval UI. Each
gets its own entry here once its milestone is actually starting, per "avoid building dozens of
unfinished features at once."
