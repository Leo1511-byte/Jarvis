# Roadmap

Full milestone-by-milestone history (M1–M29, 2026-08-09 to 2026-08-11) is archived at
[`docs/archive/ROADMAP_M1-29.md`](docs/archive/ROADMAP_M1-29.md) — real bugs, real fixes, real
verification notes, worth keeping but too long to stay the working doc. This file is the
current-state summary only.

## Where things stand (2026-08-11)

**Built and live-confirmed:** desktop app shell (Tauri + React), 4-theme system, command
engine (typed + voice, same parser), local orchestrator (shells out to `claude` CLI),
Supabase-backed Projects/Tasks/Chat/Connections/Skills/Activity, Obsidian vault read access,
voice (wake word → transcribe → speak, crash-recovery, main window only), calendar/email/
GitHub read-only checks, Level 1/2/3 permission classification with a real approval dialog for
Level 3, launchd-based (not n8n) scheduled morning brief (written, not activated), multi-window
pop-out (any real view opens in its own Tauri window, verified both frontend and Rust — M32).

**Target end-state:** `PROJECT_OBJECTIVE.md` (2026-08-11) is Leonardo's own description of what
JARVIS should actually become, walked through against three visual references. Its two
governing rules for everything below: every panel migrates toward the Iron-Man-HUD visual style
in those references, and **every number or status shown must be real — no decorative sci-fi
metrics, no fictional subsystem names.** Milestones 34-39 below are that vision broken into
buildable pieces, in the order decided during that walkthrough.

**Explicitly not built, not started, not stubbed:** anything hardware (3D printer, robotic arm
— no driver, no live Skill, no mention in real device code; M31 added a `domain` field so a
hardware Skill has a real slot, nothing more), school/study tracking, write actions for
calendar/email/GitHub (intentionally deferred — see `SECURITY.md`), the top-nav/visual redesign
and device-connection panel from `PROJECT_OBJECTIVE.md` (scoped below, none started).

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
| 32 | Multi-window foundation | **Done, live-verified end to end, 2026-08-11.** Any real view (Dashboard/Chat/Projects/Tasks/Memory/Agents/Integrations/Activity) can pop out into its own Tauri window via a Sidebar button — `?view=<slug>` loads the same bundle standalone, no shared cross-window state sync (each window independently reads the same store). Voice listener deliberately disabled outside the main window (one global backend process, not per-window). Rust half (`windows.rs`, `main.rs` registration, `capabilities/default.json`'s `"view-*"` glob) compiles clean and was click-through verified live: real second OS window, correct title/content/no-sidebar, focus-not-duplicate on repeat click. Two things genuinely still unverified, not swept under the rug: `core:default` permission grant on popped-out windows and multi-monitor placement (see "Known live gaps" above). See [`docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md`](docs/archive/HANDOFF_M32_MULTIWINDOW_RUST_VERIFICATION.md) for full verification detail |
| 33 | Memory index (carried over from M27) | Not started — needs `cargo`, real vault filesystem scanning. `PROJECT_OBJECTIVE.md`'s reference 2 (Memory Core) now gives this a concrete UI target: category counts, storage stats, linked-memory detail panel — all requiring a real vault index, not just today's single summarize-on-request prompt |
| 34 | Visual design system: tokens + `JarvisCore` restyle | Not started — dark/near-black background, electric-blue/cyan glow, angular bracket-corner HUD panels, monospace/uppercase type, green status tags, central glowing-ring Core motif, per `PROJECT_OBJECTIVE.md`'s three references. Scope: `theme.css`/`App.css` tokens and `JarvisCore.tsx`'s visual only — not the nav or panel content changes below, kept separate on purpose. Pure frontend, no `cargo` needed |
| 35 | Top-nav migration | Not started, depends on M34 for a consistent look — replaces the 13-item left Sidebar with a compact top nav showing only real/working views (Dashboard, Chat, Skills, Memory, System are confirmed by the references; Projects/Tasks/Activity/Integrations' fate — folded into System, kept as their own items, or dropped from the nav — still needs a decision, see `PROJECT_OBJECTIVE.md`'s "Not yet decided"). M32's pop-out buttons move from the Sidebar into each view's own header. Pure frontend, no `cargo` needed |
| 36 | System/Settings view — software slice | Not started, depends on M35 for somewhere to live — real Connections panel (existing `ConnectionsView` content, restyled), real `activity_events` log, real Level 1/2/3 permission/approval-gate status (no invented "Intrusion Detection"/"Threat Level"), Quick Actions limited to ones that map to a real backend call. This is also where the hardware Devices panel (idea #3) gets its home, though the panel itself stays empty/honest until a real device exists to connect (see the hardware-Skill backlog item). No new Rust — reuses what M23/M26/M28 already built |
| 37 | System/Settings view — real performance stats | Not started, needs `cargo` — CPU/memory/disk/network via a Rust system-info crate (not chosen yet), new Tauri command, wired into M36's Performance Monitor panel. New capability, not a restyle of anything existing |
| 38 | "Do anything it has access to" — real action path | Not started — extends the existing `ask` orchestrator fallback (currently read-only-by-prompt) into real actions, gated by the same Level 1/2/3 approval flow the six built-in Skills already use. Not a new system, an extension of M28/M31's |
| 39 | Self-upgrade skill | Not started — reuses `continue-project`'s existing mechanism (load context, inspect repo, implement, test, update docs), pointed at JARVIS's own repo instead of an external project, triggered only by Leonardo's explicit command. Level 3 by nature (it can break the running app) — needs its approval-flow specifics worked out before it starts, not just assumed from `continue-project`'s current Level 2 |
| — | School/study tracking | Not scoped yet — `[daily-life]` backlog item, see `TASKS.md` |
| — | Hardware device connections + first hardware Skill | Not scoped yet — blocked on Leonardo naming a real reachable device (3D printer, robotic arm, or other); M31's `Skill` interface and M36's Devices panel are both ready for one whenever that happens |

## Working agreement going forward

Lightweight process (per Leonardo, 2026-08-11): one short spec note before a milestone starts,
a terse `CHANGELOG.md` entry when it's done, this table's status updated. No approval-gate
ceremony beyond that — see `VISION.md` for why (single user, not a team).
