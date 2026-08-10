// Milestone 9 -> wired in. Spawns the confirmed-working Python voice
// scripts (System/voice/ in the Obsidian vault) as child processes via
// std::process::Command -- same pattern orchestrator.rs already uses for
// `claude`, rather than pulling in tauri-plugin-shell's sidecar bundling
// machinery, which is built for cross-compiled standalone binaries and
// doesn't fit a project-local Python venv. See VOICE_SETUP.md for the
// full writeup of this decision.
//
// Confirmed live end-to-end 2026-08-10 (see VOICE_SETUP.md for the full
// history of bugs found and fixed along the way).
//
// Crash recovery (2026-08-10, see HANDOFF_VOICE_CRASH_RECOVERY.md): if
// either child dies unexpectedly, a per-process monitor thread notices
// via periodic `Child::try_wait()`, clears the stale handle, and
// auto-restarts with linear backoff up to MAX_AUTO_RESTARTS attempts --
// beyond that it gives up and reports so rather than looping forever on a
// persistently-broken process. An explicit stop_voice_listener/
// stop_speak_daemon call clears the handle synchronously before the
// monitor's next poll, so it's never mistaken for a crash.

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

const MONITOR_POLL_INTERVAL: Duration = Duration::from_secs(2);
const BASE_BACKOFF: Duration = Duration::from_secs(1);
const MAX_AUTO_RESTARTS: u32 = 5;

#[derive(Default)]
pub struct VoiceState {
    listener: Mutex<Option<Child>>,
    speak_daemon: Mutex<Option<Child>>,
    listener_restarts: Mutex<u32>,
    speak_daemon_restarts: Mutex<u32>,
    listener_monitor_started: AtomicBool,
    speak_daemon_monitor_started: AtomicBool,
}

/// Mirrors the JSON lines listen_loop.py prints to stdout, one event per
/// line, plus a Rust-originated `Status` variant for crash/restart
/// notifications the frontend can show (e.g. "voice reconnected"). Also
/// used as the payload emitted to the frontend as the "voice-event" Tauri
/// event -- one shape, no separate DTO.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "event", rename_all = "lowercase")]
pub enum VoiceEvent {
    Wake { score: f64 },
    Transcript { text: String },
    Error { message: String },
    Status { message: String },
}

fn voice_dir() -> PathBuf {
    let home = std::env::var("HOME").expect("HOME not set");
    PathBuf::from(home).join("Documents/Obsidian Vault/System/voice")
}

fn venv_python() -> PathBuf {
    voice_dir().join(".venv/bin/python3")
}

/// Parses one line of listen_loop.py's stdout. Returns None for blank
/// lines and anything that isn't one of the known event shapes (status
/// text goes to stderr, not stdout, but this stays defensive rather than
/// assuming that always holds).
fn parse_voice_line(line: &str) -> Option<VoiceEvent> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    serde_json::from_str(trimmed).ok()
}

/// How long a monitor thread should wait before the Nth auto-restart
/// attempt -- simple linear backoff, capped at 4x the base so a
/// persistently-crashing process doesn't leave voice dark for too long
/// between tries even close to the retry limit.
fn backoff_for_attempt(attempt: u32) -> Duration {
    BASE_BACKOFF * attempt.min(4)
}

fn spawn_listener_child(app: &AppHandle) -> Result<Child, String> {
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

    let app_handle = app.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if let Some(event) = parse_voice_line(&line) {
                let _ = app_handle.emit("voice-event", event);
            }
        }
    });

    Ok(child)
}

fn spawn_speak_daemon_child() -> Result<Child, String> {
    Command::new(venv_python())
        .arg(voice_dir().join("speak_daemon.py"))
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("failed to start speak daemon (is the venv set up? see VOICE_SETUP.md): {e}"))
}

fn emit_status(app: &AppHandle, message: impl Into<String>) {
    let _ = app.emit(
        "voice-event",
        VoiceEvent::Status {
            message: message.into(),
        },
    );
}

/// Spawned once per process kind (idempotent via the `*_monitor_started`
/// flags in VoiceState). Polls every MONITOR_POLL_INTERVAL; if the
/// tracked child has exited without an explicit stop call having cleared
/// the guard first, treats it as a crash: clears the stale handle,
/// reports it, and respawns with backoff up to MAX_AUTO_RESTARTS times.
fn run_listener_monitor(app: AppHandle) {
    loop {
        std::thread::sleep(MONITOR_POLL_INTERVAL);
        let state = app.state::<VoiceState>();

        let exited = {
            let Ok(mut guard) = state.listener.lock() else {
                continue;
            };
            match guard.as_mut() {
                None => continue, // not running (never started, or intentionally stopped)
                Some(child) => match child.try_wait() {
                    Ok(Some(_)) | Err(_) => {
                        *guard = None;
                        true
                    }
                    Ok(None) => false,
                },
            }
        };
        if !exited {
            continue;
        }

        let Ok(mut restarts) = state.listener_restarts.lock() else {
            continue;
        };
        if *restarts >= MAX_AUTO_RESTARTS {
            emit_status(
                &app,
                format!(
                    "The voice listener crashed and has already been auto-restarted {MAX_AUTO_RESTARTS} times -- giving up. Toggle voice off and on to try again."
                ),
            );
            continue;
        }
        *restarts += 1;
        let attempt = *restarts;
        drop(restarts);

        emit_status(
            &app,
            format!("The voice listener crashed -- restarting (attempt {attempt}/{MAX_AUTO_RESTARTS})..."),
        );
        std::thread::sleep(backoff_for_attempt(attempt));

        match spawn_listener_child(&app) {
            Ok(child) => {
                if let Ok(mut guard) = state.listener.lock() {
                    *guard = Some(child);
                }
                emit_status(&app, "Voice listener reconnected.");
            }
            Err(e) => emit_status(&app, format!("Failed to restart the voice listener: {e}")),
        }
    }
}

fn run_speak_daemon_monitor(app: AppHandle) {
    loop {
        std::thread::sleep(MONITOR_POLL_INTERVAL);
        let state = app.state::<VoiceState>();

        let exited = {
            let Ok(mut guard) = state.speak_daemon.lock() else {
                continue;
            };
            match guard.as_mut() {
                None => continue,
                Some(child) => match child.try_wait() {
                    Ok(Some(_)) | Err(_) => {
                        *guard = None;
                        true
                    }
                    Ok(None) => false,
                },
            }
        };
        if !exited {
            continue;
        }

        let Ok(mut restarts) = state.speak_daemon_restarts.lock() else {
            continue;
        };
        if *restarts >= MAX_AUTO_RESTARTS {
            emit_status(
                &app,
                format!(
                    "The speak daemon crashed and has already been auto-restarted {MAX_AUTO_RESTARTS} times -- giving up. Toggle voice off and on to try again."
                ),
            );
            continue;
        }
        *restarts += 1;
        let attempt = *restarts;
        drop(restarts);

        emit_status(
            &app,
            format!("The speak daemon crashed -- restarting (attempt {attempt}/{MAX_AUTO_RESTARTS})..."),
        );
        std::thread::sleep(backoff_for_attempt(attempt));

        match spawn_speak_daemon_child() {
            Ok(child) => {
                if let Ok(mut guard) = state.speak_daemon.lock() {
                    *guard = Some(child);
                }
                emit_status(&app, "Speak daemon reconnected.");
            }
            Err(e) => emit_status(&app, format!("Failed to restart the speak daemon: {e}")),
        }
    }
}

#[tauri::command]
pub fn start_voice_listener(app: AppHandle, state: State<VoiceState>) -> Result<(), String> {
    {
        let mut guard = state.listener.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(()); // already running -- idempotent, matches stop below
        }
        *guard = Some(spawn_listener_child(&app)?);
    }
    // A fresh manual start (first-ever start, or the user toggling voice
    // off and on to recover) resets the auto-restart budget.
    *state.listener_restarts.lock().map_err(|e| e.to_string())? = 0;

    if !state.listener_monitor_started.swap(true, Ordering::SeqCst) {
        let app_handle = app.clone();
        std::thread::spawn(move || run_listener_monitor(app_handle));
    }
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
pub fn start_speak_daemon(app: AppHandle, state: State<VoiceState>) -> Result<(), String> {
    {
        let mut guard = state.speak_daemon.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Ok(());
        }
        *guard = Some(spawn_speak_daemon_child()?);
    }
    *state.speak_daemon_restarts.lock().map_err(|e| e.to_string())? = 0;

    if !state.speak_daemon_monitor_started.swap(true, Ordering::SeqCst) {
        let app_handle = app.clone();
        std::thread::spawn(move || run_speak_daemon_monitor(app_handle));
    }
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
    fn parses_a_status_event() {
        let event =
            parse_voice_line(r#"{"event":"status","message":"reconnected"}"#).expect("should parse");
        assert_eq!(
            event,
            VoiceEvent::Status {
                message: "reconnected".to_string()
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

    #[test]
    fn backoff_grows_then_caps_at_four_times_base() {
        assert_eq!(backoff_for_attempt(1), BASE_BACKOFF);
        assert_eq!(backoff_for_attempt(2), BASE_BACKOFF * 2);
        assert_eq!(backoff_for_attempt(4), BASE_BACKOFF * 4);
        assert_eq!(backoff_for_attempt(5), BASE_BACKOFF * 4);
        assert_eq!(backoff_for_attempt(100), BASE_BACKOFF * 4);
    }
}
