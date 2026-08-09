// Minimal Tauri shell. No commands wired to the frontend yet — that
// starts with Milestone 5 (command engine) and Milestone 6+ (Obsidian/
// Supabase/GitHub bridges), each added as its own milestone lands
// rather than stubbed out en masse here.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running jarvis");
}
