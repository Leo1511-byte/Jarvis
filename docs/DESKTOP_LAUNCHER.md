# Desktop launcher

`~/Desktop/Jarvis.app` — double-click to launch JARVIS. No terminal, no typing `cd` and
`cargo tauri dev` by hand.

## What it actually is

A tiny AppleScript app (compiled with macOS's built-in `osacompile`, not Xcode/Automator GUI)
whose only job is to run `scripts/launch-jarvis.sh` in the background and exit immediately —
that's what makes it silent (no visible Terminal window) instead of just simpler-to-set-up.
`launch-jarvis.sh` runs the **live dev build** (`cargo tauri dev`), not a compiled release
bundle — deliberate, since the app is still under active development and this always reflects
whatever's currently in the repo. Revisit once the app is feature-complete enough that a real
`cargo tauri build` release makes more sense (faster startup, no dev server, but needs
rebuilding after every future code change).

Real device/OS icon: `apps/desktop/backend/icons/icon.icns`, copied into the app bundle as
`Contents/Resources/applet.icns` — not the generic AppleScript icon.

## Why a PATH export in launch-jarvis.sh

GUI-launched processes (double-clicking an app) don't source `.zshrc`/`.bash_profile` the way an
interactive Terminal session does, so `cargo` can be missing from `PATH` even though it works
fine when you type it yourself. The script explicitly prepends `~/.cargo/bin` (where `cargo`
actually lives on this machine) before checking — same class of gotcha as `orchestrator.rs`'s
own bundled-app `PATH` resolution gap (see `docs/archive/HANDOFF_PATH_FIX_AND_VERIFICATION.md`),
just hit here at the launcher level instead of inside the compiled app.

## If it stops working

Logs: `/tmp/jarvis-dev.log` (the actual `cargo tauri dev` output) and
`/tmp/jarvis-launch-wrapper.log` (the wrapper script's own stderr, normally empty). If cargo
genuinely isn't found, the script shows a real macOS alert instead of failing silently.

Common real cause: port 1420 already in use by a leftover `vite` process from an earlier
session (check with `lsof -i :1420`, kill the stale process, retry) — hit this while verifying
the launcher works at all.

## Rebuilding the launcher (if the repo moves, or you want to change anything)

```bash
osacompile -o ~/Desktop/Jarvis.app scripts/JarvisLauncher.applescript
cp apps/desktop/backend/icons/icon.icns ~/Desktop/Jarvis.app/Contents/Resources/applet.icns
touch ~/Desktop/Jarvis.app
```

`scripts/JarvisLauncher.applescript` hardcodes the repo path
(`/Users/leonardo/Developer/jarvis/scripts/launch-jarvis.sh`) — update that path first if the
repo ever moves, then recompile.
