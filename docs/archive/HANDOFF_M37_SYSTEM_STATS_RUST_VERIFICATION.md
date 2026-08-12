# Handoff: Milestone 37 (System performance stats) — Rust side needs `cargo`

**Resolved, same session, 2026-08-12.** While diagnosing why the Desktop launcher wouldn't open
JARVIS at all (root cause: this milestone's uncompiled `sysinfo` import broke the whole binary,
not just the Performance panel), it turned out `cargo` was genuinely reachable in this Cowork
session once `PATH` explicitly included `~/.cargo/bin` — `export PATH="$HOME/.cargo/bin:$PATH"`,
then `cargo add sysinfo` (resolved `0.39.6`) and `cargo build` succeeded first try, no fixes
needed to the API usage below. **Not yet confirmed whether this is reliable across every Cowork
session** — see `CLAUDE.md`'s runtime-split note. The rest of this doc is kept as written
originally, for the record of what was and wasn't known at the time.

---

Written 2026-08-12 by Cowork, no `cargo`/`rustc` in this sandbox — same limitation as every
prior Rust handoff in this repo (M27, PATH-fix, M32). **Higher risk than those**: M32's Rust
addition only used Tauri's own already-present APIs (compiled clean first try); this one pulls
in a brand-new external crate (`sysinfo`) this session has never resolved or compiled. Treat the
Rust half here as more speculative than usual.

## What's built and verified (frontend)

- `apps/desktop/frontend/src/views/SystemView.tsx` — new Performance panel: polls
  `invoke("get_system_stats")` every 5s while mounted, only inside Tauri (`useInTauri()` gate,
  no point polling in a browser preview). Three real states handled honestly: outside Tauri →
  "Needs the desktop app"; `invoke` throws (command missing or errors) → "Couldn't read system
  stats — Milestone 37's Rust command may not be built yet"; success → real CPU%/memory GB/disk
  GB. No fake numbers shown in any state.
- Live-verified in a browser preview against the actual running dev server: Performance panel
  correctly shows the "needs the desktop app" message outside Tauri. The real running Tauri
  window (launched earlier this session via `~/Desktop/Jarvis.app`) would hit the "command may
  not be built yet" branch right now, since Vite HMR reloaded the frontend but the Rust binary
  hasn't been recompiled — exactly the intended honest degradation, not separately screenshotted
  (no way to screenshot the real Tauri window from this sandbox).
- 67 tests still passing (unchanged — this milestone has no command-engine-level behavior),
  `tsc -b`/`vite build` both clean.

## What's NOT verified (needs `cargo`)

- `apps/desktop/backend/src/system_stats.rs` (new) — `get_system_stats` Tauri command using
  `sysinfo::System`/`sysinfo::Disks`. **Never compiled, never even dependency-resolved.**
  Written against a slice of the `sysinfo` API believed stable across many 0.3x versions
  (`System::new_all`, `refresh_cpu_usage`, `refresh_memory`, `global_cpu_usage`,
  `used_memory`/`total_memory`, `Disks::new_with_refreshed_list`,
  `sysinfo::MINIMUM_CPU_UPDATE_INTERVAL`) — but genuinely not verified against whatever version
  actually resolves.
- `Cargo.toml` — **deliberately NOT edited to add the `sysinfo` dependency.** No `cargo` here to
  resolve a real version; a wrong guessed version string would break the whole build before
  `system_stats.rs`'s own code is even reached, which is worse than just not touching the file.
- `main.rs` — added `mod system_stats;` and registered `system_stats::get_system_stats` in
  `invoke_handler`. This part is trivial/low-risk, matches the existing pattern exactly.

## What to actually do

1. `cd apps/desktop/backend && cargo add sysinfo` — let cargo resolve and pin the real current
   version itself, don't hand-edit a version string.
2. `cargo build` — fix whatever doesn't compile. Likely candidates if the API has moved: method
   renames on `System`/`Disks`, or `MINIMUM_CPU_UPDATE_INTERVAL`'s exact path/name.
3. `cargo tauri dev`, then in the running app open System and confirm the Performance panel
   shows real, plausible CPU/memory/disk numbers (cross-check memory/disk against Activity
   Monitor or `top`/`df` by hand) instead of the "Rust command may not be built yet" message.
4. Let it sit for ~30s and confirm the numbers actually update (proves the 5s poll is really
   hitting the backend, not just showing a static first read).
5. Update `ROADMAP.md`'s M37 row and this handoff's status once confirmed.
