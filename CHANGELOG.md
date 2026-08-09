# Changelog

## Unreleased

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
