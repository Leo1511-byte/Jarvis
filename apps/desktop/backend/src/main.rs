// Milestone 5 shipped with no backend commands (theme/status are pure
// frontend). Milestone 10 adds the first one: `run_orchestrator`, which
// shells out to the local `claude` CLI -- see orchestrator.rs.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod orchestrator;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![orchestrator::run_orchestrator])
        .run(tauri::generate_context!())
        .expect("error while running jarvis");
}
