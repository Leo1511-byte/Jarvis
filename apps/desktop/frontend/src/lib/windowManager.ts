import { invoke } from "@tauri-apps/api/core";

/**
 * Milestone 32: asks the Rust backend (windows.rs's open_view_window) to
 * open the given view in its own window, or focus it if already open.
 * Only meaningful inside Tauri -- callers should gate this behind
 * useInTauri() the way TopNav.tsx does, since there's no window manager
 * to talk to in a plain browser preview.
 */
export async function openViewWindow(slug: string, title: string): Promise<void> {
  await invoke("open_view_window", { view: slug, title });
}
