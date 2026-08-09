# Jarvis desktop backend (Tauri)

Standard Tauri v2 project layout, adapted to this repo's `apps/desktop/{frontend,backend}`
split instead of Tauri's default `src-tauri/` next to the frontend. `tauri.conf.json` points at
`../frontend` for dev/build commands and `../frontend/dist` for the bundled frontend.

## Not yet verified

This was written from a Cowork sandbox with no Rust toolchain — `cargo`/`rustc` aren't
available there, so **this has not been compiled**. Per `ARCHITECTURE.md`'s risk log, installing
Rust is an explicit approved step (~1–2 GB, and disk was at ~22 GiB free at last check). Before
relying on this:

1. Recheck free disk space.
2. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. From `apps/desktop/frontend`: `npm install`
4. From `apps/desktop/backend`: `cargo tauri icon <path-to-a-1024x1024-png>` (no app icon exists
   yet — the bundle config references `icons/` which doesn't exist on disk yet either)
5. `cargo tauri dev` from `apps/desktop/backend` to confirm it actually launches

Don't mark Milestone 3 done in `TASKS.md` until step 5 has actually run successfully — an
unverified config isn't a working app (spec principle #6).
