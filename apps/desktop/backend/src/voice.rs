// Milestone 9 -> wired in. Spawns the confirmed-working Python voice
// scripts (System/voice/ in the Obsidian vault) as child processes via
// std::process::Command -- same pattern orchestrator.rs already uses for
// `claude`, rather than pulling in tauri-plugin-shell's sidecar bundling
// machinery, which is built for cross-compiled standalone binaries and
// doesn't fit a project-local Python venv. See VOICE_SETUP.md for the
// full writeup of this decision.
//
// wake_listener.py and transcribe.py are each individually confirmed
// live (2026-08-10), but Tauri needs one continuous process to listen
// again after every detection rather than re-spawning a single-shot
// script per cycle -- so this drives `listen_loop.py`, a new script that
// combines their already-verified logic into a loop. listen_loop.py
// itself has not been run live (needs a mic + a human saying "Hey
// Jarvis" in real time -- can't be exercised from this session, see
// TASKS.md's "lesson for next time" from the transcribe.py debugging
// session).

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct VoiceState {
    listener: Mutex<Option<Child>>,
    speak_daemon: Mutex<Option<Child>>,
}

/// Mirrors the JSON lines listen_loop.py prints to stdout, one event per
/// line. Also used as the payload emitted to the frontend as the
/// "voice-event" Tauri event -- one shape, no separate DTO.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "event", rename_all = "lowercase")]
pub enum VoiceEvent {
    Wake { score: f64 },
    Transcript { text: String },
    Error { message: String },
}

fn voice_dir() -> PathBuf {
    let home = std::env::var("HOME").expect("HOME not set");
    PathBuf::from(home).join("Documents/Obsidian Vault/System/voice")
}

fn venv_python() -> PathBuf {
    voice_dir().join(".venv/bin/python3")
}

/// Parses one line of listen_loop.py's stdout. Returns None for blank
/// lines and anything that isn't one of the three known event shapes
/// (status text goes to stderr, not stdout, but this stays defensive
/// rather than assuming that always holds).
fn parse_voice_line(line: &str) -> Option<VoiceEvent> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    serde_json::from_str(trimmed).ok()
}

#[tauri::command]
pub fn start_voice_listener(app: AppHandle, state: State<VoiceState>) -> Result<(), String> {
    let mut guard = state.listener.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(()); // already running -- idempotent, matches stop below
    }

    let mut child = Command::new(venv_python())
        .arg(voice_dir().join("listen_loop.py"))
        .stdout(Stdio::piped())
        // Inherited, not discarded: listen_loop.py's progress/error output
        // (model loading, PortAudio errors, etc.) previously vanished
        // entirely, which hid a real hang during live testing 2026-08-10 --
        // now it shows up in whatever terminal launched `cargo tauri dev`.
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to start voice listener (is the venv set up? see VOICE_SETUP.md): {e}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or("failed to capture voice listener stdout")?;

    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if let Some(event) = parse_voice_line(&line) {
                let _ = app.emit("voice-event", event);
            }
        }
    });

    *guard = Some(child);
    Ok(())
}

#[tauri::command]
pub fn stop_voice_listener(state: State<VoiceState>) -> Result<(), String> {
    let mut guard = state.listener.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        child
            .kill()
            .map_err(|e| format!("failed to stop voice listener: {e}"))?;
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
pub fn start_speak_daemon(state: State<VoiceState>) -> Result<(), String> {
    let mut guard = state.speak_daemon.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(());
    }

    let child = Command::new(venv_python())
        .arg(voice_dir().join("speak_daemon.py"))
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to start speak daemon (is the venv set up? see VOICE_SETUP.md): {e}"))?;

    *guard = Some(child);
    Ok(())
}

#[tauri::command]
pub fn stop_speak_daemon(state: State<VoiceState>) -> Result<(), String> {
    let mut guard = state.speak_daemon.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        child
            .kill()
            .map_err(|e| format!("failed to stop speak daemon: {e}"))?;
        let _ = child.wait();
    }
    Ok(())
}

/// Writes `text` into System/voice/queue/ as a .txt file for
/// speak_daemon.py to pick up and speak -- the same queue/done pattern
/// it already implements, just written to from Rust instead of by hand.
#[tauri::command]
pub fn queue_speech(text: String) -> Result<(), String> {
    let queue_dir = voice_dir().join("queue");
    std::fs::create_dir_all(&queue_dir).map_err(|e| e.to_string())?;

    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let path = queue_dir.join(format!("{millis}.txt"));

    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_wake_event() {
        let event = parse_voice_line(r#"{"event":"wake","score":0.92}"#).expect("should parse");
        assert_eq!(event, VoiceEvent::Wake { score: 0.92 });
    }

    #[test]
    fn parses_a_transcript_event() {
        let event = parse_voice_line(r#"{"event":"transcript","text":"what's on my calendar"}"#)
            .expect("should parse");
        assert_eq!(
            event,
            VoiceEvent::Transcript {
                text: "what's on my calendar".to_string()
            }
        );
    }

    #[test]
    fn parses_an_error_event() {
        let event =
            parse_voice_line(r#"{"event":"error","message":"boom"}"#).expect("should parse");
        assert_eq!(
            event,
            VoiceEvent::Error {
                message: "boom".to_string()
            }
        );
    }

    #[test]
    fn ignores_non_json_status_lines() {
        assert_eq!(
            parse_voice_line("Listening for wake word 'hey_jarvis'..."),
            None
        );
    }

    #[test]
    fn ignores_blank_lines() {
        assert_eq!(parse_voice_line("   "), None);
        assert_eq!(parse_voice_line(""), None);
    }

    #[test]
    fn ignores_malformed_json_instead_of_panicking() {
        assert_eq!(parse_voice_line("{not json"), None);
    }

    #[test]
    fn ignores_json_without_a_recognized_event_tag() {
        assert_eq!(parse_voice_line(r#"{"event":"unknown_kind"}"#), None);
    }
}
