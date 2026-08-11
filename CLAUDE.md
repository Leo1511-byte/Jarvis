# CLAUDE.md

JARVIS: Leonardo's personal AI assistant — local, single-user, not a product. Full context:
`VISION.md`. Current build status: `ROADMAP.md`.

## Runtime split — check this before doing anything

Two tiers exist, and they have different capabilities:
- **Cowork** (cloud, sandboxed): no `cargo`/`rustc`, no microphone, no hardware access, can't
  run a persistent process. Can write/edit any file, run frontend tooling (`npm`, `vitest`,
  `vite`), browse the web.
- **Local Claude Code** (on Leonardo's Mac): the only tier that can compile the Rust backend,
  touch the mic, or reach real hardware.

If you're Cowork and a task needs `cargo`, don't guess — write a handoff doc (see
`docs/archive/HANDOFF_*.md` for the pattern) instead of claiming something works that was never
compiled. Full split and why: `ARCHITECTURE.md`.

## Working agreement

Lightweight, single-user process: inspect before modifying, one milestone at a time, a short
`CHANGELOG.md` entry when a milestone lands, `ROADMAP.md`'s status table updated. No
approval-gate ceremony. **Never mark something done because it renders or compiles in your
head — done means tests pass (`npm run test`), typecheck is clean (`tsc -b`), the build succeeds
(`vite build`), and where feasible, you actually looked at it (browser preview, live click-
through) rather than trusting the code alone.**

New ideas go straight into `TASKS.md`'s prioritized Backlog (tagged by which `VISION.md` pillar
they serve) instead of getting lost mid-conversation. An item only becomes a numbered milestone
in `ROADMAP.md` once it's actually about to start.

## Known gotchas

- New Tauri windows need their label covered by `capabilities/default.json`'s `"windows"` glob,
  or they silently lack `event:listen` and other `core:default` permissions — bit this project
  twice (M9, M32).
- If GitHub Desktop is open on this repo, a stale `.git/HEAD.lock` can block commits — safe to
  remove if no real git process is running (`ps aux | grep git`).

## Security

Three permission levels (read-only / workspace-write / sensitive-needs-approval) — see
`SECURITY.md` and `apps/desktop/frontend/src/permissions.ts`. Never commit credentials; Skills'
Connection metadata is identity/capability only, never secrets.
