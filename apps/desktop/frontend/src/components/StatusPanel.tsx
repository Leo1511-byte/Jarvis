import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabaseClient";

type Status = "connected" | "disconnected" | "not-wired" | "unverified";

const LABEL: Record<Status, string> = {
  connected: "CONNECTED",
  disconnected: "DISCONNECTED",
  "not-wired": "NOT WIRED YET",
  unverified: "WIRED, UNVERIFIED",
};

/**
 * Deliberately never fakes a green checkmark (spec §5, §96). "NOT WIRED
 * YET" means no app-level code talks to that system at all. "WIRED,
 * UNVERIFIED" is the honest middle state added 2026-08-10: real code
 * exists, compiles, and is unit-tested, but nobody has confirmed it
 * works end-to-end with an actual human click or spoken word in the live
 * app window yet -- see TASKS.md's "Now" section for exactly which items
 * that applies to as of this writing. Detected dynamically where
 * possible (running inside Tauri at all, Supabase env vars present) so
 * this can't lie in a plain browser preview -- but "have I personally
 * confirmed this works" isn't something the frontend can observe on its
 * own, so it still needs a manual flip to "connected" once you have.
 */
function useSystems(): Array<{ name: string; status: Status }> {
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setInTauri(typeof w.__TAURI_INTERNALS__ !== "undefined" || typeof w.__TAURI__ !== "undefined");
  }, []);

  return [
    // M10: orchestrator.rs's run_orchestrator is real and unit-tested, but
    // no command bar command has actually been clicked through live yet.
    { name: "Claude (local orchestrator)", status: inTauri ? "unverified" : "not-wired" },
    // Nothing in the desktop app talks to the Obsidian vault directly --
    // that's Claude's own file access, not app-level code. Genuinely
    // not wired at the app level.
    { name: "Obsidian", status: "not-wired" },
    // M7: migration ran, REST insert/select/delete confirmed working
    // directly, but the UI click-through (type a name, click Add, check
    // the table editor) hasn't happened yet.
    { name: "Supabase", status: isSupabaseConfigured() ? "unverified" : "not-wired" },
    // M9: voice.rs spawns listen_loop.py/speak_daemon.py, 7 Rust tests
    // pass, but the live wake-word-to-spoken-reply loop has never
    // actually been exercised -- needs a real "Hey Jarvis" + reply.
    { name: "Voice", status: inTauri ? "unverified" : "not-wired" },
    // M12: routes through the same orchestrator as above using the
    // authenticated gh CLI -- same unverified-in-the-live-window gap.
    { name: "GitHub", status: inTauri ? "unverified" : "not-wired" },
  ];
}

export function StatusPanel() {
  const systems = useSystems();
  return (
    <div className="panel">
      <h3 className="panel-title">System Status</h3>
      <ul className="status-list">
        {systems.map((s) => (
          <li key={s.name} className="status-row">
            <span>{s.name}</span>
            <span className={"status-badge status-" + s.status}>{LABEL[s.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
