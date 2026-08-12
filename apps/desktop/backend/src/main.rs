// Milestone 5 shipped with no backend commands (theme/status are pure
// frontend). Milestone 10 adds the first one: `run_orchestrator`, which
// shells out to the local `claude` CLI -- see orchestrator.rs.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod orchestrator;
mod system_stats;
mod voice;
mod windows;

fn main() {
    tauri::Builder::default()
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
