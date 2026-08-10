# Changelog

## Unreleased

### Fixed — 2026-08-10 (missing Tauri capabilities file)
- Found live with Leonardo: toggling voice on produced this error in the Command Log (visible
  thanks to the error-surfacing fix earlier today) --
  `Failed to start voice listener: event.listen not allowed. Permissions associated with this
  command: core:event:allow-listen, core:event:default`. Root cause: `apps/desktop/backend` had
  **no `capabilities/` directory at all** -- the generated effective capabilities were `{}`.
  Custom `#[tauri::command]`s (`run_orchestrator`, `start_voice_listener`, etc.) aren't
  ACL-gated so they worked anyway, which is why this went unnoticed until the first call to
  `@tauri-apps/api/event`'s `listen()` (added today for the voice pipeline).
- Added `apps/desktop/backend/capabilities/default.json` granting `core:default` (the standard
  Tauri v2 scaffold default, which bundles `core:event:default` along with window/webview/app/
  path/image/resources/menu/tray) to the main window. Verified the fix is real, not cosmetic:
  `cargo build` regenerates `target/debug/build/*/out/capabilities.json` from empty `{}` to the
  actual granted permission set.
- `cargo test` still 20/20 passing; relaunched `cargo tauri dev` clean with the fix in place.

### Added — 2026-08-10 (Milestone 10 background-mode path)
- `orchestrator.rs`: 4 new Tauri commands — `run_orchestrator_background` (`claude --bg
  <prompt>`, returns immediately with a job id + session id), `poll_orchestrator_background`
  (`claude agents --json --all`, returns `running`/`done`/`failed`/`not_found`),
  `fetch_orchestrator_background_result` (fetches the real result once done), and
  `stop_orchestrator_background` (`claude stop <id>`, cleanup).
- Real CLI behavior verified by hand in a terminal before writing any of this (a genuine
  trivial background job, "reply with the word pong", launched/polled/fetched/stopped end to
  end): `--bg` conflicts with `-p`/`--output-format` so its launch confirmation is plain text,
  not JSON; `claude agents --json --all` never exposes result text even after `claude stop`;
  `claude logs <id>` is a raw ANSI terminal capture, not parseable output. The result is
  fetched by resuming the finished session with `--fork-session` (doesn't disturb the still-
  alive background session) and asking it to repeat its last answer with `--output-format
  json` — reuses the already-tested `parse_claude_output`. Full design rationale and the
  known cost/fidelity caveat of that approach are in `AGENT_SYSTEM.md`.
- `commandEngine.ts`: `continue-project` now calls `ctx.runOrchestratorBackground` when
  available and returns an immediate "started as a background job" response instead of
  blocking; falls back to the old synchronous path when it isn't (e.g. in tests), so the
  existing test for that path still passes unchanged. The other four orchestrator-routed
  commands are untouched — they're quick reads, sync is still the right call for them.
- `App.tsx`: `runOrchestratorBackground` + `pollBackgroundJob` — polls every 5s, and on
  completion fetches the real result and appends a second Command Log entry, then stops the
  background job for cleanup.
- 10 new Rust unit tests for the parsing logic (`parse_bg_launch`, `find_session_id`,
  `parse_bg_status`), using the **real captured output** from the hand-verification above as
  fixtures rather than guessed JSON shapes. 20 Rust tests total, all passing. 2 new frontend
  tests (background routing, background launch failure) — 33 frontend tests total, all
  passing. `tsc -b`, `vite build`, and the live `cargo tauri dev` session all still clean.
- Not verified: an actual `continue project <name>` clicked through the live app window —
  this session has no WindowServer access to its own launched window (same gap noted at
  Milestones 7 and 9).
- `AGENT_SYSTEM.md`, `ROADMAP.md`, `TASKS.md` updated.

### Added — 2026-08-10 (Milestone 9 wired into Tauri)
- New `apps/desktop/backend/src/voice.rs`: 5 Tauri commands —
  `start_voice_listener`/`stop_voice_listener` spawn/kill a new `listen_loop.py` (combines
  `wake_listener.py` + `transcribe.py`'s already-verified logic into one continuous
  wake-then-transcribe-then-loop-back process) via `std::process::Command`, forwarding its
  line-delimited JSON stdout events to the frontend as a `voice-event` Tauri event.
  `start_speak_daemon`/`stop_speak_daemon` spawn/kill `speak_daemon.py` the same way.
  `queue_speech` writes text into `System/voice/queue/` for the daemon to pick up. Chose direct
  process spawning over `tauri-plugin-shell`'s sidecar mechanism (built for cross-compiled
  binaries, doesn't fit a project-local Python venv) — see `VOICE_SETUP.md`.
- `main.rs`: registers `voice::VoiceState` and the 5 new commands alongside the existing
  `run_orchestrator`.
- New `System/voice/listen_loop.py` in the vault: continuous loop, one JSON event per stdout
  line (`wake`/`transcript`/`error`). `wake_listener.py`/`transcribe.py` untouched, still
  individually runnable.
- Frontend: new `useVoiceListener` hook starts/stops the Rust-side processes as Voice
  settings' "Microphone enabled" + "Wake word" toggles both go on, and listens for
  `voice-event`. `App.tsx` feeds `transcript` events into the same `parseCommand`/
  `executeCommand` the typed command bar uses, and queues the response to be spoken via
  `queue_speech`. `VoiceSettings`/`DashboardView` now take `settings`/`update` as props
  (lifted from a component-local hook call to App.tsx) so App.tsx can react to the same state.
  The wake-word toggle is no longer permanently disabled — it's gated on "Microphone enabled"
  instead.
- 7 new Rust unit tests for `parse_voice_line` (wake/transcript/error events, blank lines,
  malformed JSON, unrecognized event tags) — all pure-function, no mic needed. 10 Rust tests
  total, all passing. 31 frontend tests, `tsc -b`, `vite build` all still pass. `cargo tauri
  dev` hot-reloaded every change (backend and frontend) with no compile errors.
- Not verified: `listen_loop.py` live. This session's sandboxed shell hangs on `import
  sounddevice` (no CoreAudio access) the same way it has no WindowServer access for GUI
  interaction (see M7 above) — syntax-checked only (`py_compile`, `ast.parse`). One manual
  check left for Leonardo, documented in `VOICE_SETUP.md`/`TASKS.md`.
- `ROADMAP.md`, `TASKS.md`, `VOICE_SETUP.md` updated to reflect exactly what was and wasn't
  verified.

### Added — 2026-08-10 (Milestone 7 backend write path confirmed)
- Killed a stale Vite dev server left holding port 1420 from an earlier session, relaunched
  `cargo tauri dev` clean: frontend on :1420, Rust compiled, `target/debug/jarvis` running with
  no errors.
- Verified the real Supabase write path end-to-end via direct REST calls that mirror
  `SupabaseStore.createProject`/`listProjects`/`deleteProject` exactly (same table, same anon
  key from `.env.local`, same RLS policy): insert succeeded, select read the row back, delete
  cleaned it up. Confirms schema + RLS + anon key are all correctly wired — `getStore()` will
  resolve to `SupabaseStore` since `isSupabaseConfigured()` is true.
- Not verified: an actual UI click-through, since this session has no WindowServer/screen-
  recording access to see or interact with its own launched window (same limitation noted at
  Milestone 3). Left `cargo tauri dev` running for Leonardo to do the 10-second manual check.
- `ROADMAP.md`, `TASKS.md` updated to reflect exactly what was and wasn't verified.

### Added — 2026-08-10 (Milestone 7 fully provisioned)
- Real Supabase project created by Leonardo (`Leo1511-byte's Project`, free tier, AWS
  eu-central-1). Migration `packages/database/migrations/0001_init.sql` run successfully in the
  SQL editor: 5 tables (`projects`/`tasks`/`task_dependencies`/`activity_events`/`settings`) +
  RLS policies with permissive single-user access.
- `apps/desktop/frontend/.env.local` filled in with the real `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Store will switch from local storage to Supabase automatically on
  next app launch — not yet re-verified live.
- `ROADMAP.md`, `TASKS.md` updated: Milestone 7 marked done.

### Added — 2026-08-10 (Milestone 9 fully confirmed live)
- `wake_listener.py` fixed and confirmed detecting "Hey Jarvis" live (score 0.92): switched
  openWakeWord to `inference_framework="onnx"` (the default `tflite` backend has no reliable
  Apple Silicon wheel) and added an automatic `download_models()` call (the pip package ships
  code only, not the model weight files).
- `speak_daemon.py` rewritten to support two TTS engines via `config.json`'s new `tts_engine`
  key: `macos_say` (new default — free, fully offline, macOS's built-in `say` command, no API
  key) and `elevenlabs` (original path, kept intact). Confirmed working live with real audio.
- Root cause for the ElevenLabs path: its free API tier blocks TTS generation entirely
  regardless of voice (402 `paid_plan_required`), confirmed both via web search and by hitting
  it live with a Voice Library voice and a premade voice. Not just a Voice Library restriction
  as ElevenLabs' own error message implies.
- `config.json`/`config.example.json` updated with `tts_engine` and `macos_say_voice` keys and
  comments documenting the free-tier limitation and how to switch back to ElevenLabs later.
- `ROADMAP.md`, `TASKS.md` updated: Milestone 9 marked done, no longer a blocked item.

### Added — 2026-08-09 (Milestones 11, 14, 15, 16 built; 17 reframed)
- `commandEngine.ts`: three new command kinds — `continue-project` (M11, spec §62's full
  workflow as a single orchestrator prompt), `check-calendar` (M14), `check-email` (M15) — plus
  the `research` (M16) command committed earlier. All four call the same
  `run_orchestrator` Tauri command from M10 with a different, purpose-built prompt; the
  read-only three (research/calendar/email) explicitly tell the orchestrator not to send,
  draft, label, or modify anything. No new Rust code required — `run_orchestrator`'s generic
  `prompt: String` interface was already enough.
- `permissions.ts`: classified the three new kinds — research/check-calendar/check-email as
  Level 1 (explicitly read-only), continue-project as Level 2 (writes to a project repo, but
  traceable via git history and the orchestrator's session id, not gated per-action).
- `runOrchestratorOrExplain` helper added to `commandEngine.ts` so the "no orchestrator
  connection" / error-handling logic exists once instead of copy-pasted across four commands.
- 9 new tests (4 parsing, 5 execution) in `commandEngine.test.ts`; 2 new tests in
  `permissions.test.ts`. 29 total frontend tests passing. `tsc -b`/`vite build` verified.
- `AGENT_SYSTEM.md` rewritten: Milestone 17's original "specialist agents" design assumed
  separate agent processes/personas behind a routing table. What actually got built is simpler
  — four prompt templates over one orchestrator call — and there's no evidence yet that
  separate personas would behave differently than a clear, scoped prompt each time. Documented
  as the real (simpler) architecture rather than building the originally-sketched routing table
  just to match the spec's shape.
- `COMMANDS.md`, `ROADMAP.md` updated to describe all four orchestrator-routed commands and
  their permission levels.
- Committed local Claude Code's independently-completed M10 slice + verification work
  (`dd3bb38`) after finding it uncommitted in the working tree: real `cargo tauri dev` launch,
  `transcribe.py` verified end-to-end, `gh auth`/Calendar MCP/Gmail MCP all verified locally,
  a real regression fix (Node 25's native `localStorage` breaking 6 tests since the vitest 2→4
  bump). Re-verified the frontend side independently before committing rather than trusting the
  docs' claims at face value. Added `.claude/settings.local.json` to `.gitignore`.
- Milestone 12 (GitHub) closed the same way as 14/15: `check my github` / `check my prs` /
  `check my pull requests` / `check my issues` route through the orchestrator with a prompt
  telling `claude` to use its already-authenticated `gh` command directly — no GitHub MCP server
  needed. Level 1, explicitly read-only ("don't create, comment on, merge, or close anything").
  4 new tests — 31 total passing. `MCP_SETUP.md` updated with the general lesson: an MCP server
  is only needed when the orchestrator can't already reach a capability some other way.

### Added — 2026-08-09
- Initial repo scaffold: `apps/`, `packages/{ui,core,agents,memory,tools,voice,permissions,
  database,integrations,automations}`, `shared/`, `config/`, `tests/`, `scripts/`, `docs/`.
- `.gitignore` covering `.env`, keys, tokens, credentials, and the existing vault's
  `System/voice/config.json`.
- Full docs set: `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `TASKS.md`, `SECURITY.md`,
  `INSTALLATION.md`, `MCP_SETUP.md`, `VOICE_SETUP.md`, `OBSIDIAN_SETUP.md`,
  `DATABASE_SCHEMA.md`, `AUTOMATIONS.md`, `COMMANDS.md`, `AGENT_SYSTEM.md`, `UI_DESIGN.md`,
  `TESTING.md`, `TROUBLESHOOTING.md`, `SYSTEM_INSPECTION_PROMPT.md`.
- Git repository initialized.

### Added — 2026-08-09 (later)
- Milestone 1 (system inspection) completed via local Claude Code; report saved to
  `~/Documents/Obsidian Vault/System/SYSTEM_INSPECTION_REPORT.md`.
- Stack decided from real data: Tauri (Rust install pending, Milestone 3), Supabase Cloud,
  launchd/cron instead of n8n initially, local Claude Code confirmed as orchestrator.
- Vault path corrected to `~/Documents/Obsidian Vault`, confirmed by Leonardo.
- Risks logged: tight disk (~22 GiB free), prior unrelated "Jarvis"-named app remnants on disk,
  GitHub auth is HTTPS not SSH, two coexisting Claude Code installs, unverified mic permission
  state, repo currently sitting inside a Claude session artifacts folder (needs relocating).

### Added — 2026-08-09 (Milestone 3/4)
- `apps/desktop/frontend`: Vite + React + TypeScript app. Builds clean (`npm run build`
  verified in-session). Theme token system (`src/theme.css`) implementing Crimson Command,
  Neon Void, Holographic Core, and Obsidian, persisted via `localStorage`. `JarvisCore`
  component with all 10 spec states (idle through offline) as CSS animations, respecting
  `prefers-reduced-motion`. Sidebar nav shell (12 sections, no routing yet), disabled command
  bar placeholder, status panel that honestly reports "NOT WIRED YET" instead of faking
  connection state.
- `apps/desktop/backend`: Tauri v2 config (`Cargo.toml`, `tauri.conf.json`, `main.rs`).
  **Not compiled or verified** — written without a Rust toolchain available; see its README for
  the real verification steps before trusting it.

### Added — 2026-08-09 (Milestone 3 verification + Milestone 6)
- Local Claude Code compiled the Tauri backend: `apps/desktop/backend/target/debug/jarvis` is a
  real Mach-O arm64 binary. It fixed a redundant `[lib]` block in `Cargo.toml` and relative
  frontend paths in `tauri.conf.json`, and generated app icons (checked: not the Marvel/Iron Man
  image flagged earlier).
- Repo relocated to `~/Developer/jarvis`.
- Milestone 6 (Obsidian memory) built and verified in `~/Documents/Obsidian Vault`: `JARVIS.md`,
  `System/memory.md`, all 3 scripts (run-tested against real seeded content, not just written),
  `Inbox/`/`Daily/`/`Notes/`/`Briefs/` populated. Ran the literal spec §12 connection test.

### Added — 2026-08-09 (Milestone 5)
- `apps/desktop/frontend/src/commandEngine.ts`: real parser (`parseCommand`) and executor
  (`executeCommand`) — theme switching and status are real actions, everything else honestly
  returns "not implemented yet" instead of a fabricated response.
- 5 unit tests in `commandEngine.test.ts`, passing.
- `CommandBar` enabled and wired to the engine; `App.tsx` shows a live command log and drives
  the Jarvis Core through processing/success/error states from real command execution.
- `COMMANDS.md` rewritten to separate what's actually working (desktop command bar + the
  pre-existing Obsidian-skill trigger phrases) from the spec's target command list.
- Noted: `npm audit` reports a moderate esbuild advisory in the vitest/vite dev toolchain
  (dev-server only) — not fixed, tracked in `TASKS.md`.

### Added — 2026-08-09 (Milestone 9, partial)
- Voice stack decided: openWakeWord (local wake word), faster-whisper (local STT), ElevenLabs
  (cloud TTS, behind an interchangeable interface). Rationale in `VOICE_SETUP.md`.
- `~/Documents/Obsidian Vault/System/voice/{wake_listener,transcribe,speak_daemon}.py` written,
  syntax-checked with `py_compile`. **Not run** — no microphone/audio hardware in the sandbox
  that wrote them. `requirements.txt`, `config.example.json`, `README.md` included.
- `JARVIS.md` corrected — it previously implied this folder already existed; it didn't until
  today.
- Frontend: `useVoiceSettings` (persisted toggles), `useAudioDevices` (real device enumeration +
  permission status via Web APIs), `VoiceSettings` panel added to the dashboard. Wake-word
  toggle is explicitly disabled with a tooltip explaining why, rather than looking functional
  when it isn't. `npm run test`/`build` verified passing.

### Added — 2026-08-09 (Milestones 7 + 8)
- `packages/database/migrations/0001_init.sql`: real schema (projects, tasks,
  task_dependencies, activity_events, settings) with RLS enabled.
- `apps/desktop/frontend/src/lib/supabaseClient.ts`, `store/supabaseStore.ts`: real Supabase
  client and store implementation, matching the migration exactly. Untested — no project
  provisioned (account creation isn't something Claude does for you).
- `store/localStore.ts`: the store that's actually active right now, backed by localStorage.
  6 tests passing.
- `store/index.ts`: `getStore()` picks Supabase or local automatically based on whether
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set.
- `ProjectsView.tsx`, `TasksView.tsx`: real CRUD UI. Sidebar nav (`App.tsx`) now actually routes
  between Dashboard/Projects/Tasks instead of always showing the dashboard regardless of
  selection — that gap existed since Milestone 3 and is fixed now.
- `INSTALLATION.md`, `DATABASE_SCHEMA.md` updated with the exact steps to provision Supabase.

### Fixed — 2026-08-09 (npm audit)
- `apps/desktop/frontend`: `npm audit` actually reported 5 findings (esbuild moderate, vite high
  path-traversal, vitest **critical** — arbitrary file read/execute via its UI server — plus 2
  more in the same dependency chain), not just the single moderate esbuild advisory previously
  noted. All dev-only (not shipped in the production build), but the severity was undersold.
  `npm audit fix --force` bumped `vitest` `^2.1.8` → `^4.1.10`; `vite` stayed `^6.0.3`. Re-ran the
  full verification after the bump: 16 tests pass, `tsc -b` and `vite build` both pass. `npm
  audit` now reports 0 vulnerabilities.

### Added — 2026-08-09 (Milestones 10, 11, 12, 14, 15, 16, 17, 19, 20 — architecture pass)
- `ROADMAP.md`: replaced bare "Not started" rows with real design decisions and specific
  blockers for each remaining milestone, distinguishing "blocked on a local orchestrator process
  that doesn't exist yet" (M10, M11, M16, M17) from "blocked on local MCP config, not
  authorization" (M14, M15) from "blocked on you confirming M3's visual launch" (M20).
- `MCP_SETUP.md` corrected: Calendar and Gmail MCP connectors are already connected at the
  Cowork account level (checked directly) — the real gap is that Cowork's connectors don't
  transfer to the local runtime that will actually run as JARVIS, not missing authorization.
- `TESTING.md`: added an actual coverage summary (16 tests passing, what's verified against real
  systems vs. syntax-checked only vs. not applicable yet) instead of leaving it as an empty plan.
- No new application code in this pass, deliberately — routing/integration code for M10/M11/
  M16/M17 needs a local orchestrator process to run against; writing it now would be untestable
  and would repeat the "renders but isn't connected" mistake called out by spec principle #6.

### Added — 2026-08-09 (Milestone 13)
- `~/Documents/Obsidian Vault/System/scripts/morning_brief.py`: generates `Briefs/YYYY-MM-DD.md`
  from today's Daily note, open tasks across `Daily/`/`Notes/`/`Inbox/`, Inbox backlog count, and
  the last 5 `System/memory.md` entries. Run manually against the real vault (not just syntax-
  checked) — produced a correct brief. Explicitly states it doesn't cover calendar/email.
- `packages/automations/launchd/dev.leonardo.jarvis.morningbrief.plist`: daily 7am launchd job.
  Written and documented (`packages/automations/launchd/README.md`), **not loaded** —
  `launchctl load` is left to the user, not run automatically.
- Corrected `AUTOMATIONS.md`, which incorrectly stated a Cowork scheduled task already generated
  the brief; no such task existed (verified via `list_scheduled_tasks`). Also updated
  `JARVIS.md`'s "morning brief" trigger phrase and vault map to match reality.

### Added — 2026-08-09 (Milestone 18)
- `apps/desktop/frontend/src/permissions.ts`: `PermissionLevel` (1/2/3) and `permissionLevelFor`,
  classifying command kinds per spec §54. Unknown kinds default to the strictest level.
- `store/types.ts`, `localStore.ts`, `supabaseStore.ts`: added `deleteProject`, the first Level 3
  action wired end-to-end. `localStore` cascades to delete the project's tasks, matching the
  migration's `on delete cascade`.
- `components/ApprovalDialog.tsx` + `.css`: real modal implementing spec §55's
  ACTION/CONTEXT/REASON/RISK format with Approve/Deny — no default action, no auto-approve.
- `hooks/useApproval.ts`: promise-based approval flow (`requestApproval` resolves once the user
  responds) so call sites can `await` a real decision instead of assuming yes.
- `ProjectsView.tsx`: added a Delete button per project, gated through `useApproval` — the store's
  `deleteProject` only runs after the user clicks Approve in the dialog.
- `commandEngine.ts`: added `delete-project` parsing (`"delete project <name>"` /
  `"remove project <name>"`), but `executeCommand` deliberately does not perform the deletion —
  it tells the user to use the Projects view instead, since a typed command has no real
  confirmation surface to gate a Level 3 action behind.
- 5 new tests (3 in `permissions.test.ts`, 2 in `commandEngine.test.ts`) — 16 total passing.
  `tsc -b` and `vite build` both verified.

### Verified — 2026-08-09 (local Claude Code session: launch + voice + MCP)
- Milestone 3: `cargo tauri dev` run for real (previously only `cargo build` had been verified).
  Compiled in 2.79s, Vite served the frontend on `:1420`, `target/debug/jarvis` launched and came
  to the foreground.
- Milestone 9: voice script dependencies installed into an isolated `.venv` in `System/voice/`
  (`uv venv` + `uv pip install -r requirements.txt`, 36 packages). `transcribe.py` confirmed
  working end-to-end (mic → faster-whisper `small` → correct transcript), run directly by
  Leonardo after several rounds of debugging established that driving real-time mic input
  through an assistant's tool calls doesn't work — no live terminal for the user to react to, so
  "speak now" prompts never land in time. `wake_listener.py` handed off the same way, result
  pending. `speak_daemon.py` still blocked: `elevenlabs_api_key` in `config.json` is empty
  (checked programmatically, length 0, without ever printing the file's contents).
- Milestones 14/15: corrected a second time. Called `list_calendars` and `list_labels` directly
  from this local Claude Code session and got real data back — the Calendar/Gmail MCP connectors
  are already configured and working locally, not just in Cowork as previously documented. Real
  blocker for M14/15 is now purely the M10 orchestrator, not MCP config. `MCP_SETUP.md` and
  `ROADMAP.md` updated.
- Milestone 12: `gh auth status` confirms real, active HTTPS GitHub auth.
- Spot-checked `~/Desktop/Jarvis.app` (gone), `~/plugins/jarvis` (unrelated Codex plugin dir),
  `~/.Trash` (no `jarvis-desktop` remnants) — no bundle id collision risk.
- Declined to run `launchctl load` for the morning-brief job even under a blanket "always allow"
  grant from Leonardo — `packages/automations/launchd/README.md` states the reasoning
  explicitly (a recurring job writing to the vault should start because the user turned it on),
  and a general permission grant doesn't override a specific, documented project principle.
  Left as a 3-line manual step.

### Added — 2026-08-09 (Milestone 10, first real slice)
- Scoped the orchestrator design with Leonardo before writing code: Tauri's Rust backend shells
  out to the local `claude` CLI rather than a separate Agent SDK server, reusing existing auth
  and the just-verified local MCP servers. Verified `claude -p --output-format json`,
  `claude --bg`, and `claude agents --json` by hand in a terminal first.
- `apps/desktop/backend/src/orchestrator.rs`: `run_orchestrator` Tauri command, runs
  `claude -p --output-format json` via `tauri::async_runtime::spawn_blocking`, parses the result/
  error/session id. 3 Rust unit tests.
- `commandEngine.ts`: new `research <topic>` command kind, routed through an injected
  `ctx.runOrchestrator` (keeps the engine testable without Tauri). `executeCommand` is now
  `async`. 4 new tests; existing tests updated to `await`.
- `App.tsx`: real `invoke("run_orchestrator", ...)` wiring via `@tauri-apps/api` (new dependency).
- Fixed a real test regression from the vitest 2→4 bump (`5e2d7f9`): Node 25's experimental
  native `localStorage`, on by default, was shadowing jsdom's and silently breaking 6
  `localStore.test.ts` tests. `TASKS.md`'s prior "16 tests still pass" note for that commit was
  wrong — fixed via `NODE_OPTIONS=--no-experimental-webstorage` in the `test` script.
- Removed a stale `.git/index.lock` (70+ min old, no git process holding it, confirmed via `ps`)
  that was blocking `git stash`/other git operations — likely left behind by GitHub Desktop.

### Corrected vs. original spec
- Runtime split documented: Cowork (this session) cannot run local system inspection, access
  the microphone, or persist a background process. `ARCHITECTURE.md` now specifies a local
  Claude Code / Agent SDK process as the actual JARVIS runtime.
- `OBSIDIAN_SETUP.md` reconciles the spec's proposed vault structure with the vault that
  already exists at `/Users/leonardo/obsidian`, instead of creating a conflicting parallel
  structure.
