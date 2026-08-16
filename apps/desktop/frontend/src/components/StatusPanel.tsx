import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useInTauri } from "../hooks/useInTauri";

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
 * app window yet -- see project/TASKS.md's "Now" section for exactly which items
 * that applies to as of this writing. Detected dynamically where
 * possible (running inside Tauri at all, Supabase env vars present) so
 * this can't lie in a plain browser preview -- but "have I personally
 * confirmed this works" isn't something the frontend can observe on its
 * own, so it still needs a manual flip to "connected" once you have.
 */
function useSystems(): Array<{ name: string; status: Status }> {
  const inTauri = useInTauri();

  return [
    // M10: confirmed live 2026-08-10/11 -- research/check-calendar/
    // check-email/check-github/ask/continue-project all returned real
    // results in the actual running app (see project/TASKS.md for each). Still
    // gated on inTauri so a plain browser preview (vite dev, no Tauri
    // backend) can't inherit a "connected" claim it hasn't earned.
    { name: "Claude (local orchestrator)", status: inTauri ? "connected" : "not-wired" },
    // M20 (2026-08-11): the last "not wired" system now has a real path
    // in -- the check-memory command (see commandEngine.ts) asks the
    // orchestrator's `claude` to read the vault directly, same pattern as
    // Calendar/Email/GitHub. Unlike those, this is brand new and hasn't
    // been exercised live yet, so it starts at "unverified" like they did
    // before their own first live confirmation, not "connected".
    { name: "Obsidian", status: inTauri ? "unverified" : "not-wired" },
    // M7: confirmed live 2026-08-10 -- created a real project through the
    // actual Projects UI, persisted and displayed correctly, in addition
    // to the earlier direct-REST proof.
    { name: "Supabase", status: isSupabaseConfigured() && inTauri ? "connected" : "not-wired" },
    // M9: confirmed live 2026-08-10 -- real "Hey Jarvis" wake, transcript,
    // and spoken reply, plus the self-talk feedback loop bug found and
    // fixed after. Leonardo's own words: "the voice is perfect."
    { name: "Voice", status: inTauri ? "connected" : "not-wired" },
    // M12: confirmed live 2026-08-11 -- check my github returned a real
    // result after a permission-gap fix (see project/TASKS.md).
    { name: "GitHub", status: inTauri ? "connected" : "not-wired" },
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
