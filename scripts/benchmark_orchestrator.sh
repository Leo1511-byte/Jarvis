#!/usr/bin/env bash
#
# Benchmarks the real latency of JARVIS's 5 orchestrator-routed commands
# (research, continue-project, check-calendar, check-email, check-github) --
# Milestone 19's "performance benchmarking hasn't started" gap.
#
# Design decision: calls `claude` directly with the exact same prompts
# apps/desktop/frontend/src/commandEngine.ts sends, instead of driving the
# Tauri app end-to-end. orchestrator.rs's run_orchestrator/
# run_orchestrator_background are thin wrappers -- Command::new("claude")
# .arg(...).output() -- that add microseconds of process-spawn overhead on
# top of the `claude` CLI round-trip itself, which is where all the real
# latency (seconds, sometimes tens of seconds for tool-using turns) lives.
# Measuring `claude` directly gets the number that actually matters without
# needing cargo or the app running, and is what this repo's own established
# pattern already does (see orchestrator.rs's comments: every Rust command
# shape was verified by hand with a bare `claude` call before any Rust was
# written).
#
# Why this can't be run from the Cowork sandbox that wrote it: this
# specific project's `claude` needs to be the same authenticated CLI with
# the same locally-configured MCP servers (Calendar, Gmail) and `gh` auth
# that live on Leonardo's actual machine -- a `claude` binary anywhere else
# wouldn't be measuring the same thing. Run this from a normal terminal on
# the machine `cargo tauri dev` runs on, from the repo root:
#
#   bash scripts/benchmark_orchestrator.sh
#
# Uses bash's $SECONDS (whole-second resolution) rather than `date +%s.%N`
# -- GNU date's %N (nanoseconds) doesn't exist on macOS's built-in BSD
# `date`, and sub-second precision doesn't matter for calls that take
# multiple seconds anyway.

set -uo pipefail

if ! command -v claude >/dev/null 2>&1; then
  echo "claude not found on PATH -- this needs to run on the machine with the" >&2
  echo "authenticated CLI (same one cargo tauri dev's orchestrator shells out to)." >&2
  exit 1
fi

RUNS="${RUNS:-3}"
RESULTS_FILE="benchmark_results_$(date +%Y%m%d_%H%M%S).md"

echo "# Orchestrator latency benchmark -- $(date)" > "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "$RUNS run(s) per command. Elapsed times are whole seconds (bash \$SECONDS)." >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Extracts a field from `claude -p --output-format json`'s output without
# assuming jq is installed (it often isn't by default on macOS) -- python3
# already is, since the voice scripts depend on it.
extract_json_field() {
  local field="$1"
  python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    print(data.get('$field', '?'))
except Exception:
    print('?')
"
}

run_sync() {
  local name="$1"
  local prompt="$2"
  echo "### $name" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  for i in $(seq 1 "$RUNS"); do
    echo "  [$name] run $i/$RUNS..." >&2
    local start=$SECONDS
    local output
    output=$(claude -p "$prompt" --output-format json 2>&1)
    local status=$?
    local elapsed=$((SECONDS - start))
    if [ "$status" -ne 0 ]; then
      echo "- run $i: FAILED after ${elapsed}s -- \`$(echo "$output" | tail -c 200)\`" >> "$RESULTS_FILE"
      continue
    fi
    local cost
    cost=$(echo "$output" | extract_json_field total_cost_usd)
    echo "- run $i: ${elapsed}s, \$${cost}" >> "$RESULTS_FILE"
  done
  echo "" >> "$RESULTS_FILE"
}

run_background() {
  echo "### continue-project (background mode: launch + poll-until-done)" >> "$RESULTS_FILE"
  echo "" >> "$RESULTS_FILE"
  for i in $(seq 1 "$RUNS"); do
    echo "  [continue-project/background] run $i/$RUNS..." >&2
    local start=$SECONDS
    local launch
    launch=$(claude --bg "Reply with exactly the single word: pong" 2>&1)
    local job_id
    job_id=$(echo "$launch" | grep -oE 'backgrounded[^a-f0-9]*[a-f0-9]+' | grep -oE '[a-f0-9]+$')
    if [ -z "$job_id" ]; then
      echo "- run $i: FAILED to parse a job id from \`claude --bg\` -- \`$launch\`" >> "$RESULTS_FILE"
      continue
    fi
    local launch_elapsed=$((SECONDS - start))

    local state=""
    local waited=0
    while [ "$waited" -lt 30 ]; do
      state=$(claude agents --json --all 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    entry = next((e for e in data if e.get('id') == '$job_id'), None)
    print(entry.get('state', '') if entry else '')
except Exception:
    print('')
")
      if [ "$state" = "done" ] || [ "$state" = "failed" ]; then
        break
      fi
      sleep 1
      waited=$((waited + 1))
    done
    local total_elapsed=$((SECONDS - start))
    claude stop "$job_id" >/dev/null 2>&1 || true

    if [ "$state" = "done" ]; then
      echo "- run $i: launch ${launch_elapsed}s, done after ${total_elapsed}s total" >> "$RESULTS_FILE"
    else
      echo "- run $i: launch ${launch_elapsed}s, did not reach 'done' within 30s (last state: '${state:-none}')" >> "$RESULTS_FILE"
    fi
  done
  echo "" >> "$RESULTS_FILE"
}

# Same prompts commandEngine.ts's executeCommand actually sends (see that
# file) -- copy any future prompt-wording changes here too, or this stops
# measuring what JARVIS really does.
run_sync "research" \
  "Research: what is the current date. Write findings as a new note in the Obsidian vault's Notes/ folder, then reply with one sentence summarizing what you found and the note's file path."

run_sync "check-calendar" \
  "Check my calendar for today and the next couple of days using the Calendar MCP tools already configured locally, then reply with 2-3 sentences summarizing what's coming up. Read-only -- don't create, modify, or respond to any events."

run_sync "check-email" \
  "Check my email inbox using the Gmail MCP tools already configured locally for anything urgent or unread that needs my attention, then reply with 2-3 sentences summarizing it. Read-only -- don't send, draft, or label anything."

run_sync "check-github" \
  "Check GitHub for any open PRs or issues assigned to me, using the gh CLI (already authenticated locally), then reply with 2-3 sentences summarizing what needs attention. Read-only -- don't create, comment on, merge, or close anything."

# continue-project's real prompt names an actual project and does real work
# (spec §62's full workflow), which isn't a fair repeatable benchmark -- it
# writes real commits and each run's cost/duration depends entirely on how
# much work the "next step" turns out to be. Benchmarking the fixed
# launch-to-done plumbing overhead with a trivial prompt instead (same
# thing the real Rust unit tests' fixtures already use) isolates the
# background-mode machinery's own cost from any specific project's work.
run_background

echo "" >> "$RESULTS_FILE"
echo "Done. Results: $RESULTS_FILE" >&2
cat "$RESULTS_FILE"
