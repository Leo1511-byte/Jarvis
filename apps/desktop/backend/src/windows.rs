use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Milestone 32 (multi-window foundation): opens the given view (a slug
/// matching one of `lib/popoutViews.ts`'s `POPOUT_VIEWS` values, e.g.
/// "chat") in its own Tauri window, or focuses it if already open. Each
/// popped-out window loads the exact same frontend bundle as the main
/// window with a `?view=<slug>` query param -- see `main.tsx`, which reads
/// it and renders just that one view (no Sidebar/voice listener) instead
/// of the full app shell. This keeps one React app, one build, one
/// source of truth for every view's real logic; nothing is duplicated
/// for the standalone case.
///
/// Window label is `view-<slug>` -- capabilities/default.json's
/// `"windows"` list has to include a pattern matching this (`"view-*"`)
/// or the new window's webview gets none of the core permissions
/// (event:listen, etc.) the main window has, same class of bug Milestone
/// 9 hit with the first capabilities file.
#[tauri::command]
pub fn open_view_window(app: AppHandle, view: String, title: String) -> Result<(), String> {
    let label = format!("view-{view}");

    if let Some(existing) = app.get_webview_window(&label) {
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let url = WebviewUrl::App(format!("index.html?view={view}").into());
    WebviewWindowBuilder::new(&app, &label, url)
        .title(title)
        .inner_size(480.0, 720.0)
        .min_inner_size(320.0, 320.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
