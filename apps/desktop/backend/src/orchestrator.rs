// Milestone 10 (first real slice). Shells out to the local `claude` CLI
// synchronously (`claude -p --output-format json`) rather than standing up
// a separate Agent SDK server -- reuses the already-authenticated CLI and
// its already-verified local MCP servers (Calendar, Gmail, GitHub auth)
// with no new credential handling. See docs/ARCHITECTURE.md / MCP_SETUP.md.
//
// Known limitation, not yet fixed: relies on `claude` being resolvable via
// PATH, which is true under `cargo tauri dev` (inherits the launching
// shell's environment) but won't be true for a double-clicked, bundled
// app launched from Finder (minimal PATH, no `~/.local/bin`). Fixing that
// needs an absolute-path lookup at build or first-run time -- deferred
// until the bundled build is actually being tested, per the same
// "don't build ahead of what's verified" principle as the rest of this repo.

use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Debug)]
pub struct OrchestratorResponse {
    pub result: String,
    pub session_id: String,
    pub cost_usd: f64,
}

#[derive(Deserialize)]
struct ClaudeJsonResult {
    result: String,
    session_id: String,
    #[serde(default)]
    is_error: bool,
    #[serde(default)]
    total_cost_usd: f64,
}

fn parse_claude_output(stdout: &str) -> Result<OrchestratorResponse, String> {
    let parsed: ClaudeJsonResult = serde_json::from_str(stdout)
        .map_err(|e| format!("failed to parse claude output: {e}\nraw: {stdout}"))?;

    if parsed.is_error {
        return Err(parsed.result);
    }

    Ok(OrchestratorResponse {
        result: parsed.result,
        session_id: parsed.session_id,
        cost_usd: parsed.total_cost_usd,
    })
}

#[tauri::command]
pub async fn run_orchestrator(prompt: String) -> Result<OrchestratorResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("claude")
            .arg("-p")
            .arg(&prompt)
            .arg("--output-format")
            .arg("json")
            .output()
            .map_err(|e| format!("failed to run claude (is it on PATH?): {e}"))?;

        if !output.status.success() {
            return Err(format!(
                "claude exited with {}: {}",
                output.status,
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        parse_claude_output(&String::from_utf8_lossy(&output.stdout))
    })
    .await
    .map_err(|e| format!("orchestrator task panicked: {e}"))?
}

// --- Background mode (Milestone 10, second slice) ---------------------
//
// `claude -p --output-format json` above blocks until the whole turn
// finishes -- fine for a quick read, wrong for `continue project`'s full
// spec §62 workflow on a big task. This adds the background-mode path
// parked when M10 first shipped: `claude --bg` to launch without
// blocking, `claude agents --json --all` to poll status.
//
// Verified by hand in a terminal before writing this (2026-08-10):
// - `claude --bg "<prompt>"` conflicts with `-p`/`--output-format` (they
//   only apply to `--print` sessions), so its launch confirmation is
//   plain text ("backgrounded · <id>"), not JSON -- parsed below.
// - `claude agents --json --all` returns a JSON array with `id`
//   (short job id), `sessionId` (full UUID), `kind` ("background" vs
//   "interactive"), and `state` ("done" once finished) -- but no field
//   ever carries the actual result text, even after `claude stop`.
// - `claude logs <id>` is the only other built-in way to read a
//   background session's output, but it's a raw ANSI terminal capture
//   (cursor-positioning escapes, redrawn spinner frames) meant for a
//   human's terminal, not for programmatic parsing.
// - The one reliable way to get a clean result found by hand: resume the
//   finished session non-interactively with `--fork-session` (so it
//   doesn't disturb the still-alive background session) and ask it to
//   repeat its last answer, with `--output-format json` same as the sync
//   path -- reuses `parse_claude_output` unchanged. Costs one small extra
//   API call per completed job and asks the model to reproduce text
//   rather than reading it back byte-exact -- acceptable for now, noted
//   as a real limitation in docs/AGENTS.md rather than hidden.

#[derive(Serialize, Debug, Clone, PartialEq)]
pub struct BackgroundJob {
    pub job_id: String,
    pub session_id: String,
}

#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BackgroundState {
    Running,
    Done,
    Failed,
    NotFound,
}

#[derive(Deserialize, Debug)]
struct AgentEntry {
    #[serde(default)]
    id: Option<String>,
    #[serde(rename = "sessionId", default)]
    session_id: Option<String>,
    #[serde(default)]
    state: Option<String>,
    kind: String,
}

/// Parses `claude --bg`'s plain-text launch confirmation for the short
/// job id out of its "backgrounded · <id>" line.
fn parse_bg_launch(stdout: &str) -> Result<String, String> {
    for line in stdout.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("backgrounded") {
            if let Some(id) = rest
                .rsplit(['\u{b7}', ' '])
                .find(|s| !s.is_empty())
            {
                return Ok(id.to_string());
            }
        }
    }
    Err(format!(
        "could not find a background job id in claude's output:\n{stdout}"
    ))
}

fn parse_agents_json(agents_json: &str) -> Result<Vec<AgentEntry>, String> {
    serde_json::from_str(agents_json)
        .map_err(|e| format!("failed to parse `claude agents --json` output: {e}\nraw: {agents_json}"))
}

/// Finds the full session UUID for a just-launched background job by
/// matching its short id against `claude agents --json --all`'s output.
fn find_session_id(agents_json: &str, job_id: &str) -> Result<String, String> {
    let entries = parse_agents_json(agents_json)?;
    entries
        .into_iter()
        .find(|e| e.kind == "background" && e.id.as_deref() == Some(job_id))
        .and_then(|e| e.session_id)
        .ok_or_else(|| format!("job {job_id} not found in `claude agents --json` output"))
}

/// Maps a background job's entry in `claude agents --json --all`'s
/// output to a simple status. Anything present but not yet "done" (or a
/// failure state) is still `Running` -- deliberately permissive about
/// unrecognized state strings rather than erroring on them, since the
/// CLI's exact vocabulary for in-progress states wasn't exercised live
/// (the one job run by hand while writing this finished in ~2s).
fn parse_bg_status(agents_json: &str, job_id: &str) -> Result<BackgroundState, String> {
    let entries = parse_agents_json(agents_json)?;
    let entry = entries
        .into_iter()
        .find(|e| e.kind == "background" && e.id.as_deref() == Some(job_id));
    Ok(match entry {
        None => BackgroundState::NotFound,
        Some(e) => match e.state.as_deref() {
            Some("done") => BackgroundState::Done,
            Some("failed") | Some("error") => BackgroundState::Failed,
            _ => BackgroundState::Running,
        },
    })
}

#[tauri::command]
pub async fn run_orchestrator_background(prompt: String) -> Result<BackgroundJob, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let launch = Command::new("claude")
            .arg("--bg")
            .arg(&prompt)
            .output()
            .map_err(|e| format!("failed to run claude --bg (is it on PATH?): {e}"))?;
        if !launch.status.success() {
            return Err(format!(
                "claude --bg exited with {}: {}",
                launch.status,
                String::from_utf8_lossy(&launch.stderr)
            ));
        }
        let job_id = parse_bg_launch(&String::from_utf8_lossy(&launch.stdout))?;

        let agents = Command::new("claude")
            .arg("agents")
            .arg("--json")
            .arg("--all")
            .output()
            .map_err(|e| format!("failed to run claude agents --json (is it on PATH?): {e}"))?;
        if !agents.status.success() {
            return Err(format!(
                "claude agents --json exited with {}: {}",
                agents.status,
                String::from_utf8_lossy(&agents.stderr)
            ));
        }
        let session_id = find_session_id(&String::from_utf8_lossy(&agents.stdout), &job_id)?;

        Ok(BackgroundJob { job_id, session_id })
    })
    .await
    .map_err(|e| format!("orchestrator task panicked: {e}"))?
}

#[tauri::command]
pub async fn poll_orchestrator_background(job_id: String) -> Result<BackgroundState, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("claude")
            .arg("agents")
            .arg("--json")
            .arg("--all")
            .output()
            .map_err(|e| format!("failed to run claude agents --json (is it on PATH?): {e}"))?;
        if !output.status.success() {
            return Err(format!(
                "claude agents --json exited with {}: {}",
                output.status,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        parse_bg_status(&String::from_utf8_lossy(&output.stdout), &job_id)
    })
    .await
    .map_err(|e| format!("poll task panicked: {e}"))?
}

#[tauri::command]
pub async fn fetch_orchestrator_background_result(
    session_id: String,
) -> Result<OrchestratorResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("claude")
            .arg("-p")
            .arg("--resume")
            .arg(&session_id)
            .arg("--fork-session")
            .arg("--output-format")
            .arg("json")
            .arg(
                "This is an automated status check, not a new instruction: output your \
                 immediately preceding response to the user again, character-for-character, \
                 with no additions, no summary, and no commentary.",
            )
            .output()
            .map_err(|e| format!("failed to fetch background result (is claude on PATH?): {e}"))?;
        if !output.status.success() {
            return Err(format!(
                "claude exited with {}: {}",
                output.status,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        parse_claude_output(&String::from_utf8_lossy(&output.stdout))
    })
    .await
    .map_err(|e| format!("fetch task panicked: {e}"))?
}

#[tauri::command]
pub async fn stop_orchestrator_background(job_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("claude")
            .arg("stop")
            .arg(&job_id)
            .output()
            .map_err(|e| format!("failed to stop background job: {e}"))?;
        if !output.status.success() {
            return Err(format!(
                "claude stop exited with {}: {}",
                output.status,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("stop task panicked: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_successful_claude_json_result() {
        let raw = r#"{"is_error":false,"session_id":"abc-123","total_cost_usd":0.09,"result":"sync test ok"}"#;
        let parsed = parse_claude_output(raw).expect("should parse");
        assert_eq!(parsed.result, "sync test ok");
        assert_eq!(parsed.session_id, "abc-123");
        assert_eq!(parsed.cost_usd, 0.09);
    }

    #[test]
    fn surfaces_claude_reported_errors() {
        let raw = r#"{"is_error":true,"session_id":"abc-123","total_cost_usd":0.0,"result":"something went wrong"}"#;
        let err = parse_claude_output(raw).unwrap_err();
        assert_eq!(err, "something went wrong");
    }

    #[test]
    fn rejects_malformed_output_instead_of_panicking() {
        let err = parse_claude_output("not json").unwrap_err();
        assert!(err.contains("failed to parse claude output"));
    }

    // --- background mode -- fixtures below are real output captured by
    // hand from `claude --bg` / `claude agents --json --all` while
    // writing this (2026-08-10), not guessed shapes.

    const REAL_BG_LAUNCH_OUTPUT: &str = "Starting background service…\nbackgrounded · 84f90224\n  claude agents             list sessions\n  claude attach 84f90224    open in this terminal\n  claude logs 84f90224      show recent output\n  claude stop 84f90224      stop this session\n";

    const REAL_AGENTS_JSON: &str = r#"[
        {
            "pid": 43132,
            "cwd": "/Users/leonardo/Developer/jarvis",
            "kind": "interactive",
            "startedAt": 1786304849854,
            "sessionId": "466de66a-7aa0-482f-8086-b9d6f67d6215",
            "name": "jarvis-23",
            "status": "idle"
        },
        {
            "pid": 55455,
            "id": "84f90224",
            "cwd": "/Users/leonardo/Developer/jarvis",
            "kind": "background",
            "startedAt": 1786360381465,
            "sessionId": "84f90224-0afe-4cb9-904e-774c6780bb06",
            "name": "Reply with exactly the single word: pong",
            "status": "idle",
            "state": "done"
        }
    ]"#;

    #[test]
    fn parses_the_job_id_out_of_a_real_bg_launch_confirmation() {
        assert_eq!(parse_bg_launch(REAL_BG_LAUNCH_OUTPUT).unwrap(), "84f90224");
    }

    #[test]
    fn errors_if_no_backgrounded_line_is_found() {
        let err = parse_bg_launch("some unexpected output\n").unwrap_err();
        assert!(err.contains("could not find a background job id"));
    }

    #[test]
    fn finds_the_session_id_for_a_matching_job() {
        let session_id = find_session_id(REAL_AGENTS_JSON, "84f90224").unwrap();
        assert_eq!(session_id, "84f90224-0afe-4cb9-904e-774c6780bb06");
    }

    #[test]
    fn errors_when_the_job_id_has_no_matching_entry() {
        let err = find_session_id(REAL_AGENTS_JSON, "nonexistent").unwrap_err();
        assert!(err.contains("not found"));
    }

    #[test]
    fn ignores_interactive_sessions_when_finding_a_background_job() {
        // The interactive jarvis-23 entry has no `id` field at all -- make sure
        // an id lookup can't accidentally match kind:"interactive" entries.
        let err = find_session_id(REAL_AGENTS_JSON, "jarvis-23").unwrap_err();
        assert!(err.contains("not found"));
    }

    #[test]
    fn reports_done_status_for_a_finished_job() {
        assert_eq!(
            parse_bg_status(REAL_AGENTS_JSON, "84f90224").unwrap(),
            BackgroundState::Done
        );
    }

    #[test]
    fn reports_not_found_for_an_unknown_job_id() {
        assert_eq!(
            parse_bg_status(REAL_AGENTS_JSON, "nonexistent").unwrap(),
            BackgroundState::NotFound
        );
    }

    #[test]
    fn reports_failed_status_when_the_cli_reports_it() {
        let json = r#"[{"id":"abc123","kind":"background","sessionId":"s-1","state":"failed"}]"#;
        assert_eq!(
            parse_bg_status(json, "abc123").unwrap(),
            BackgroundState::Failed
        );
    }

    #[test]
    fn treats_unrecognized_states_as_still_running() {
        let json = r#"[{"id":"abc123","kind":"background","sessionId":"s-1","state":"working"}]"#;
        assert_eq!(
            parse_bg_status(json, "abc123").unwrap(),
            BackgroundState::Running
        );
    }

    #[test]
    fn rejects_malformed_agents_json_instead_of_panicking() {
        let err = parse_agents_json("not json").unwrap_err();
        assert!(err.contains("failed to parse"));
    }
}
