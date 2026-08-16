# CLAUDE.md

JARVIS: Leonardo's personal AI assistant — local, single-user, not a product. Full context:
`VISION.md`. Current build status: `project/ROADMAP.md`.

## Docs map

This file is the short, always-loaded constitution. For anything longer, go to:

| Doc | What it covers |
|---|---|
| `docs/WAYS_OF_WORKING.md` | The detailed Claude Code development workflow — read before a milestone |
| `docs/ARCHITECTURE.md` | Tier split, stack decisions, why |
| `docs/SYSTEMS.md` | Current-state map of every real system (start here for "how does X work") |
| `docs/MEMORY.md`, `docs/SKILLS.md`, `docs/CONNECTIONS.md`, `docs/AGENTS.md`, `docs/VOICE.md` | Per-system detail |
| `docs/SECURITY.md` | Permission levels, secrets rules |
| `project/TASKS.md` | What to work on right now |
| `project/ROADMAP.md` | Milestone history and status |
| `CHANGELOG.md` | Dated entries per landed change |

## Runtime split — check this before doing anything

Two tiers exist, and they have different capabilities:
- **Cowork** (cloud, sandboxed): no `cargo`/`rustc`, no microphone, no hardware access, can't
  run a persistent process. Can write/edit any file, run frontend tooling (`npm`, `vitest`,
  `vite`), browse the web.
- **Local Claude Code** (on Leonardo's Mac): the only tier that can compile the Rust backend,
  touch the mic, or reach real hardware.

If you're Cowork and a task needs `cargo`, don't guess — write a handoff doc (see
`docs/archive/HANDOFF_*.md` for the pattern) instead of claiming something works that was never
compiled. Full split and why: `docs/ARCHITECTURE.md`.

**2026-08-12 finding, not yet fully trusted:** in one Cowork session, `cargo`/`rustc` turned out
to be genuinely reachable at `~/.cargo/bin` once `PATH` was set explicitly — `which cargo` fails
with the default shell PATH (which is why every earlier session concluded "no cargo here"), but
`export PATH="$HOME/.cargo/bin:$PATH"` made `cargo build`/`cargo add` actually work, compiling
real Rust changes (M37) that a prior handoff had assumed impossible. Not yet confirmed whether
this holds for every Cowork session or was specific to this one's environment — **try the PATH
export and a real `cargo build` before writing a "needs cargo" handoff**, and update this note
once it's clear whether this is reliable.

## Working agreement

Lightweight, single-user process: inspect before modifying, one milestone at a time, a short
`CHANGELOG.md` entry when a milestone lands, `project/ROADMAP.md`'s status table updated. No
approval-gate ceremony. **Never mark something done because it renders or compiles in your
head — done means tests pass (`npm run test`), typecheck is clean (`tsc -b`), the build succeeds
(`vite build`), and where feasible, you actually looked at it (browser preview, live click-
through) rather than trusting the code alone.**

New ideas go straight into `project/TASKS.md`'s prioritized Backlog (tagged by which `VISION.md` pillar
they serve) instead of getting lost mid-conversation. An item only becomes a numbered milestone
in `project/ROADMAP.md` once it's actually about to start.

**Before every commit** (not just at session end): show Leonardo a summary of what changed —
which files, the real substance of the change, not just "updated X" — and wait for his explicit
go-ahead before running `git commit`. Reviewing the diff yourself first is necessary but not
sufficient; he reviews it too, every time, not just for big changes. Once he's done doing real
work in this repo, commit it and push to GitHub (`origin`) rather than leaving it as uncommitted
local changes — land it, don't just describe it. Still follow the standard git safety rules (no
force-push, no skipped hooks).

Files under `~/Documents/Obsidian Vault/` (the voice scripts, `config.json` with its real API
keys, etc.) are **not** part of this git repo and are never committed or pushed anywhere — the
vault isn't even a git repository. Edits there are direct file changes on disk, full stop.

## Known gotchas

- New Tauri windows need their label covered by `capabilities/default.json`'s `"windows"` glob,
  or they silently lack `event:listen` and other `core:default` permissions — bit this project
  twice (M9, M32).
- If GitHub Desktop is open on this repo, a stale `.git/HEAD.lock` can block commits — safe to
  remove if no real git process is running (`ps aux | grep git`).

## Security

Three permission levels (read-only / workspace-write / sensitive-needs-approval) — see
`docs/SECURITY.md` and `apps/desktop/frontend/src/permissions.ts`. Never commit credentials; Skills'
Connection metadata is identity/capability only, never secrets.
