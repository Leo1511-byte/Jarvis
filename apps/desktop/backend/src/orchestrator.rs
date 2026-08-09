// Milestone 10 (first real slice). Shells out to the local `claude` CLI
// synchronously (`claude -p --output-format json`) rather than standing up
// a separate Agent SDK server -- reuses the already-authenticated CLI and
// its already-verified local MCP servers (Calendar, Gmail, GitHub auth)
// with no new credential handling. See ARCHITECTURE.md / MCP_SETUP.md.
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
}
