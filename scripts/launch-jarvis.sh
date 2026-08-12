#!/bin/bash
#
# Launches the live dev build of JARVIS (`cargo tauri dev`) with no visible
# terminal window -- meant to be invoked by a double-clickable Desktop
# launcher app (see docs/DESKTOP_LAUNCHER.md for how to build that app),
# not run interactively. Runs the *dev* build on purpose, not a compiled
# release bundle: the app is still under active development, so this
# always reflects whatever's currently in the repo rather than needing a
# rebuild after every change. Revisit once the app is feature-complete
# enough that a real `cargo tauri build` release makes more sense.
#
# GUI-launched processes (double-clicking an app, unlike an interactive
# terminal) don't source .zshrc/.bash_profile, so `cargo` can be missing
# from PATH even though it works fine in Terminal. Explicitly add the
# common Rust/Homebrew install locations before checking, and fail with a
# real macOS alert (not silently) if cargo still isn't found.
export PATH="$HOME/.cargo/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_DIR/apps/desktop/backend"
LOG_FILE="/tmp/jarvis-dev.log"

if ! command -v cargo >/dev/null 2>&1; then
  osascript -e 'display alert "JARVIS launch failed" message "cargo is not on PATH. Try running scripts/launch-jarvis.sh directly from a terminal to see the real error." as critical'
  exit 1
fi

cd "$BACKEND_DIR" || {
  osascript -e 'display alert "JARVIS launch failed" message "Could not find apps/desktop/backend -- has the repo moved?" as critical'
  exit 1
}

exec cargo tauri dev >"$LOG_FILE" 2>&1
