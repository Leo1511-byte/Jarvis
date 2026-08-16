import { useEffect, useState } from "react";
import { getStore, type Connection, type ConnectionCapability } from "../lib/store";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useInTauri } from "../hooks/useInTauri";

type Status = "connected" | "unverified" | "not-wired";

const LABEL: Record<Status, string> = {
  connected: "CONNECTED",
  unverified: "WIRED, UNVERIFIED",
  "not-wired": "NOT WIRED YET",
};

/**
 * Milestone 23 — replaces the "Integrations" placeholder. A read-only
 * registry, not a settings page: nothing here is created, edited, or
 * authenticated from the UI (see builtinConnections.ts's doc comment for
 * why). Status per connection follows the exact same honesty rule
 * StatusPanel.tsx already established (spec §5/§96, never fake a green
 * checkmark) -- reusing `useInTauri` rather than re-deriving it, and kept
 * as its own small map here (rather than importing StatusPanel's list
 * directly) since StatusPanel's five rows and these six connections don't
 * line up 1:1 -- StatusPanel has "Voice" (not a Skill-usable Connection)
 * and no separate Calendar/Gmail/Web rows.
 */
function statusFor(id: string, inTauri: boolean): Status {
  switch (id) {
    // M14/M15/M12: confirmed live via real command-bar results (see
    // project/TASKS.md) -- same evidence bar StatusPanel's GitHub row uses.
    case "calendar":
    case "gmail":
    case "github":
      return inTauri ? "connected" : "not-wired";
    // M6/M20: check-memory is real but, per StatusPanel's own Obsidian
    // row, not yet clicked through live in the running app.
    case "obsidian":
      return inTauri ? "unverified" : "not-wired";
    // M16: research <topic> works and is tested, but project/ROADMAP.md's M16 row
    // (unlike M12/M14/M15) never claims a live UI confirmation -- stays
    // unverified rather than borrowing that claim.
    case "web":
      return inTauri ? "unverified" : "not-wired";
    case "supabase":
      return isSupabaseConfigured() && inTauri ? "connected" : "not-wired";
    default:
      return "not-wired";
  }
}

export function ConnectionsView() {
  const inTauri = useInTauri();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, ConnectionCapability[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const store = getStore();
      try {
        const list = await store.listConnections();
        if (cancelled) return;
        setConnections(list);
        const entries = await Promise.all(
          list.map(async (c) => [c.id, await store.listConnectionCapabilities(c.id)] as const)
        );
        if (!cancelled) setCapabilities(Object.fromEntries(entries));
      } catch {
        if (!cancelled) {
          setConnections([]);
          setCapabilities({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Connections</h2>
        <p className="empty-state">
          What JARVIS can actually reach, and what it's allowed to do with each — read-only
          registry, not a settings page. Auth for every one of these lives outside this app (OS
          keyring, <code>.claude/settings.local.json</code>, <code>.env.local</code>) — this list
          never stores a credential, per the Chat/Memory/Skills/Connections plan's security
          section.
        </p>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : connections.length === 0 ? (
        <p className="empty-state">
          No connections found — if Supabase is configured, run{" "}
          <code>packages/database/migrations/0003_connections.sql</code> in the SQL editor first.
        </p>
      ) : (
        <div className="panel-grid">
          {connections.map((c) => {
            const status = statusFor(c.id, inTauri);
            return (
              <div key={c.id} className="panel">
                <h3 className="panel-title">{c.name}</h3>
                <div className="status-row">
                  <span>Status</span>
                  <span className={"status-badge status-" + status}>{LABEL[status]}</span>
                </div>
                <ul className="status-list" style={{ marginTop: "var(--space-2)" }}>
                  {(capabilities[c.id] ?? []).map((cap) => (
                    <li key={cap.id} className="status-row">
                      <span>{cap.capability}</span>
                      <span style={{ color: "var(--text-dim)" }}>
                        {cap.readOnly ? "read-only" : "write"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
