// Milestone 5 shipped with no backend commands (theme/status are pure
// frontend). Milestone 10 adds the first one: `run_orchestrator`, which
// shells out to the local `claude` CLI -- see orchestrator.rs.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod orchestrator;
mod system_stats;
mod voice;
mod windows;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // Single-instance guard, registered first per Tauri's own guidance.
        // Found live 2026-08-13 diagnosing a voice self-listening report:
        // nothing previously stopped a second full app launch (e.g.
        // double-clicking the Desktop launcher while JARVIS was already
        // running) from spawning its own independent listen_loop.py/
        // speak_daemon.py pair -- both sharing the one speaking.flag file
        // voice.rs's coordination depends on. speak_daemon.py
        // unconditionally clears that flag on its own startup, so a
        // second instance starting while the first was mid-speech would
        // instantly un-mute every listener while JARVIS was still
        // talking, feeding its own voice back into itself. A second
        // launch attempt now just focuses the existing window instead.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(voice::VoiceState::default())
        .invoke_handler(tauri::generate_handler![
            orchestrator::run_orchestrator,
            orchestrator::run_orchestrator_background,
            orchestrator::poll_orchestrator_background,
            orchestrator::fetch_orchestrator_background_result,
            orchestrator::stop_orchestrator_background,
            voice::start_voice_listener,
            voice::stop_voice_listener,
            voice::start_speak_daemon,
            voice::stop_speak_daemon,
            voice::queue_speech,
            windows::open_view_window,
            system_stats::get_system_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running jarvis");
}
