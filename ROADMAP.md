# Roadmap

Full milestone-by-milestone history (M1–M29, 2026-08-09 to 2026-08-11) is archived at
[`docs/archive/ROADMAP_M1-29.md`](docs/archive/ROADMAP_M1-29.md) — real bugs, real fixes, real
verification notes, worth keeping but too long to stay the working doc. This file is the
current-state summary only.

## Where things stand (2026-08-11)

**Built and live-confirmed:** desktop app shell (Tauri + React) with a top-nav layout (M35,
replaced the old 13-item left Sidebar) and an Iron-Man-HUD visual system (M34: bracket-corner
panels, glow, grid backdrop, restyled `JarvisCore`) across all 4 themes, command engine (typed +
voice, same parser), local orchestrator (shells out to `claude` CLI), Supabase-backed
Projects/Tasks/Chat/Connections/Skills/Activity, Obsidian vault read access, voice (wake word →
transcribe → speak, crash-recovery, main window only), calendar/email/GitHub read-only checks,
Level 1/2/3 permission classification with a real approval dialog for Level 3, launchd-based
(not n8n) scheduled morning brief (written, not activated), multi-window pop-out (any real view
opens in its own Tauri window, verified both frontend and Rust — M32), a real System overview
(M36: version/build/runtime, permission-level summary, Connections/Activity summary tiles, honest
empty Devices panel), a double-clickable Desktop launcher (`~/Desktop/Jarvis.app`, see
`docs/DESKTOP_LAUNCHER.md` — tooling, not a numbered milestone).

**Target end-state:** `PROJECT_OBJECTIVE.md` (2026-08-11) is Leonardo's own description of what
JARVIS should actually become, walked through against three visual references. Its two
governing rules for everything below: every panel migrates toward the Iron-Man-HUD visual style
in those references, and **every number or status shown must be real — no decorative sci-fi
metrics, no fictional subsystem names.** Milestones 34-39 below are that vision broken into
buildable pieces, in the order decided during that walkthrough.

**Explicitly not built, not started, not stubbed:** anything hardware (3D printer, robotic arm
— no driver, no live Skill, no mention in real device code; M31 added a `domain` field so a
hardware Skill has a real slot, System's Devices panel is ready to show one, nothing more exists
yet), school/study tracking, write actions for calendar/email/GitHub (intentionally deferred —
see `SECURITY.md`), real performance stats (M37, needs `cargo`), Quick Actions on System
(intentionally omitted — no real backend action exists yet to back one).

**Known live gaps carried forward:** Memory index / real vault browsing (M27/M33, needs `cargo`,
see [`docs/archive/HANDOFF_MEMORY_INDEX_AND_MIGRATIONS.md`](docs/archive/HANDOFF_MEMORY_INDEX_AND_MIGRATIONS.md)),
bundled-app `PATH` resolution in `orchestrator.rs` (works under `cargo tauri dev`, untested in a
double-clicked release build — see
[`docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md`](docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md)),
M32's `core:default` permission grant on popped-out windows (structurally correct, not yet
behaviorally exercised — no code calls `event:listen` from one to test it) and multi-monitor
placement (untested, single-display dev machine).

## Current milestones

| # | Milestone | Status |
|---|---|---|
| 30 | Docs restructure | **Done, 2026-08-11** |
| 31 | Skills engine redesign | **Done, 2026-08-11** — real `Skill` interface (`skills/types.ts`: permission level, `domain: software \| hardware`, `execute()`) and registry (`skills/registry.ts`) now the single source of truth for the six built-in Skills' prompts, permission levels, and execution — previously duplicated by hand across `commandEngine.ts`'s switch statement, `permissions.ts`, and `lib/store/builtinSkills.ts`. All three now derive from the registry. No hardware Skill added (no device to back one) — `domain` just gives one a real place to slot in later. 57 tests passing (up from 53), `tsc -b`/`vite build` clean, no behavior change |
| 32 | Multi-window foundation | **Done, live-verified end to end, 2026-08-11.** Any real view (Dashboard/Chat/Projects/Tasks/Memory/Skills/Connections/Activity) can pop out into its own Tauri window via a nav button (originally the Sidebar, moved to the top nav at M35) — `?view=<slug>` loads the same bundle standalone, no shared cross-window state sync (each window independently reads the same store). Voice listener deliberately disabled outside the main window (one global backend process, not per-window). Rust half (`windows.rs`, `main.rs` registration, `capabilities/default.json`'s `"view-*"` glob) compiles clean and was click-through verified live: real second OS window, correct title/content/no-nav, focus-not-duplicate on repeat click. Two things genuinely still unverified, not swept under the rug: `core:default` permission grant on popped-out windows and multi-monitor placement (see "Known live gaps" above). See [`docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md`](docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md) for full verification detail |
| 33 | Memory index (carried over from M27) | Not started — needs `cargo`, real vault filesystem scanning. `PROJECT_OBJECTIVE.md`'s reference 2 (Memory Core) now gives this a concrete UI target: category counts, storage stats, linked-memory detail panel — all requiring a real vault index, not just today's single summarize-on-request prompt |
| 34 | Visual design system: tokens + `JarvisCore` restyle | **Done, live-verified across all 4 themes, 2026-08-11.** `.panel` (shared by every view — Dashboard/Projects/Tasks/Memory/Chat/Connections/Skills/Activity/StatusPanel/VoiceSettings) restyled with bracket-corner accents, an angular radius, and an accent glow — one CSS change, whole app picked it up with zero per-view edits. Added a faint theme-driven grid backdrop to `body`. `JarvisCore`'s SVG extended (not replaced) with 24 fixed instrument-bezel ticks and a vertical light beam through the core, alongside the existing 3-ring/nucleus animation system — all 10 states (idle through error) still read correctly through the additions. `status-connected` badges got a small glow, kept deliberately off unverified/not-wired states so the glow stays an honest signal. 57 tests passing (unchanged — CSS/SVG only), `tsc -b`/`vite build` clean, checked live in a browser preview across Holographic Core, Crimson Command, and Neon Void |
| 35 | Top-nav migration | **Done, live-verified, 2026-08-11.** `Sidebar.tsx` (13 items, 5 real placeholders like Research/Automations/Notifications never backed by anything) replaced by `TopNav.tsx`: a flat 9-item bar — Dashboard, Chat, Skills, Memory, Connections, Projects, Tasks, Activity, System — every item real except System (included because all three references confirm it as primary; shows an honest `NotBuiltView` until M36). Decided against a "more" dropdown for the non-primary-5 views (Projects/Tasks/Connections/Activity) — nothing lost, no extra interaction layer; can revisit if the bar feels crowded. Renamed two mismatched labels while migrating: "Agents"→"Skills" and "Integrations"→"Connections" (both always rendered `SkillsView`/`ConnectionsView`; only the label was wrong). M32's pop-out buttons moved into `TopNav` alongside each item. `.app-shell` changed from a 2-column grid to a flex column (nav row + scrollable main). 57 tests passing (unchanged), `tsc -b`/`vite build` clean, live-checked: routing to all 9 items, System's honest not-built state, and `?view=skills` standalone rendering with the renamed slug |
| 36 | System/Settings view — software slice | **Done, live-verified, 2026-08-11 — scope refined during build.** New `SystemView.tsx` replaces the `System` placeholder: real App info (version, dev/prod build mode via `import.meta.env.DEV`, Tauri-vs-browser runtime — all genuinely detected, not hardcoded), real Permissions summary (Skill counts by Level 1/2/3, derived from `skills/registry.ts`), a Connections summary tile (real count + "Open Connections" link) and an Activity summary tile (last 3 real events + "Open Activity" link), and an honest empty-state Devices panel (idea #3's home, stays empty until a real hardware Skill exists). **Deliberately does not re-embed full `ConnectionsView`/`ActivityView` content** — both already have their own top-nav tab since M35, so duplicating full lists here would be the "add stuff, don't overload it" mistake Leonardo flagged reviewing the visual references; summary tiles that link out instead, matching the references' own "OPEN SECURITY CENTER" pattern. **No Quick Actions section** — every action in the references (Optimize System, Clear Cache, Restart Core) would need a real backend call behind it and none exists yet; adding non-functional buttons would violate the real-data rule worse than omitting the section. `System` added to `popoutViews.ts` now that it's real content. 57 tests passing (unchanged), `tsc -b`/`vite build` clean, live-verified: real Skill/Connection counts confirmed correct against the registries, honest "Browser preview" runtime detection, both navigate-out links work |
| 37 | System/Settings view — real performance stats | Not started, needs `cargo` — CPU/memory/disk/network via a Rust system-info crate (not chosen yet), new Tauri command, wired into M36's Performance Monitor panel. New capability, not a restyle of anything existing |
| 38 | "Do anything it has access to" — real action path | **Built, unit-tested, 2026-08-11 — real live end-to-end verification still open.** `ask` (the fallback for anything not matching a built-in Skill) now has a two-call design instead of permanent describe-only: first asks the orchestrator to classify its own reply `SAFE:` (read/analyze/explain, answer immediately) or `NEEDS_APPROVAL:` (would change something, describe the plan and stop). A `NEEDS_APPROVAL` plan routes through the exact same `ApprovalDialog`/`useApproval` flow the six built-in Skills' Level 3 case uses (a new `requestApproval` field on `CommandContext`, wired from `App.tsx`); on approval, a second independent prompt tells the orchestrator to actually do it. Deliberately binary, not Level 1/2/3 — for arbitrary free text with no pre-reviewed prompt template, treating any real change as needing approval is the safer default. **Honesty caveat, not hidden:** this is a behavioral guardrail via prompting, not a technical sandbox — nothing stops the model from acting before classifying, the same limitation the old always-describe prompt had. **Genuinely not yet verified:** whether the real `claude` CLI reliably follows the `SAFE:`/`NEEDS_APPROVAL:` convention in practice, and whether the approval dialog fires correctly end-to-end inside the actual running app — this needs a live Tauri session with an unpredictable real response, which a browser preview can't exercise (`invoke` fails outside Tauri). 4 new tests (61 total, up from 57) cover the gating logic itself (approve/deny/no-approval-flow available/format-fallback), `tsc -b`/`vite build` clean. Suggested live test phrase once run locally: something unambiguously action-requiring, e.g. "delete my notes.txt file" |
| 39 | Self-upgrade skill | Not started — reuses `continue-project`'s existing mechanism (load context, inspect repo, implement, test, update docs), pointed at JARVIS's own repo instead of an external project, triggered only by Leonardo's explicit command. Level 3 by nature (it can break the running app) — needs its approval-flow specifics worked out before it starts, not just assumed from `continue-project`'s current Level 2 |
| — | School/study tracking | Not scoped yet — `[daily-life]` backlog item, see `TASKS.md` |
| — | Hardware device connections + first hardware Skill | Not scoped yet — blocked on Leonardo naming a real reachable device (3D printer, robotic arm, or other); M31's `Skill` interface and M36's Devices panel are both ready for one whenever that happens |

## Working agreement going forward

Lightweight process (per Leonardo, 2026-08-11): one short spec note before a milestone starts,
a terse `CHANGELOG.md` entry when it's done, this table's status updated. No approval-gate
ceremony beyond that — see `VISION.md` for why (single user, not a team).
