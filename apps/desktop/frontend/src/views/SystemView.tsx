import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getStore, type ActivityEvent, type Connection } from "../lib/store";
import { SKILLS } from "../skills/registry";
import { useInTauri } from "../hooks/useInTauri";

// Milestone 37: field names match system_stats.rs's SystemStats struct's
// default serde output exactly (snake_case, not renamed to camelCase) --
// same convention orchestrator.rs's OrchestratorResponse already uses on
// the frontend (see App.tsx), kept consistent rather than mixing styles.
interface SystemStats {
  cpu_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
}

const STATS_POLL_MS = 5000;

// Kept in sync by hand with package.json's "version" field -- not
// imported directly, since tsconfig.json's `include: ["src"]` would put
// that import outside the project's own rootDir for `tsc -b`. Cheap
// enough to keep matching manually; revisit if this ever drifts.
const APP_VERSION = "0.1.0";

const RECENT_ACTIVITY_LIMIT = 3;

/**
 * Milestone 36 (System/Settings, software slice) — replaces the "System"
 * placeholder. Per PROJECT_OBJECTIVE.md's decisions: real data only, no
 * decorative sci-fi metrics or fictional subsystem names (references 1-3
 * all had some -- "Neural Engine," "Learning Rate 2.7x," etc. -- none of
 * that exists here, so none of it is shown).
 *
 * Deliberately does NOT re-embed ConnectionsView's or ActivityView's full
 * lists -- both already have their own top-nav tab (Milestone 35's flat
 * 9-item bar), and duplicating full content here would be exactly the
 * "add stuff, don't overload it" mistake Leonardo flagged when reviewing
 * the visual references. Instead: small real-count summary tiles that
 * link to the real views, per the references' own "OPEN SECURITY CENTER"/
 * "VIEW ALL PROCESSES" pattern (a hub that points elsewhere, not a
 * duplicate).
 *
 * No Quick Actions section -- every action in the references (Optimize
 * System, Clear Cache, Restart Core, Emergency Protocol) would need a
 * real backend call behind it, and none exists yet. Adding buttons that
 * don't do anything real would be worse than not having the section;
 * revisit once there's an actual action to wire.
 *
 * Milestone 37 added the Performance panel (CPU/memory/disk via a new
 * `get_system_stats` Tauri command, system_stats.rs) -- degrades
 * honestly outside Tauri or if the Rust command isn't built yet, rather
 * than showing fake numbers.
 *
 * The hardware Devices panel lives here (idea #3 from PROJECT_OBJECTIVE.md)
 * but stays an honest empty state -- no device exists to connect yet (see
 * project/TASKS.md's backlog item #3).
 */
export function SystemView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const inTauri = useInTauri();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  // Milestone 37: only polls inside Tauri -- invoke() has nothing to
  // reach in a browser preview, and polling there would just be a
  // repeated no-op. get_system_stats (system_stats.rs) hasn't been
  // compiled/verified by this session (needs cargo) -- if it's missing
  // or errors, this shows an honest message below rather than crashing
  // or inventing numbers.
  useEffect(() => {
    if (!inTauri) return;
    let cancelled = false;
    async function poll() {
      try {
        const result = await invoke<SystemStats>("get_system_stats");
        if (!cancelled) {
          setStats(result);
          setStatsError(false);
        }
      } catch {
        if (!cancelled) setStatsError(true);
      }
    }
    poll();
    const interval = window.setInterval(poll, STATS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [inTauri]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const store = getStore();
      try {
        const [conns, events] = await Promise.all([
          store.listConnections(),
          store.listActivityEvents(RECENT_ACTIVITY_LIMIT),
        ]);
        if (!cancelled) {
          setConnections(conns);
          setRecentActivity(events);
        }
      } catch {
        if (!cancelled) {
          setConnections([]);
          setRecentActivity([]);
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

  const skillsByLevel = {
    1: SKILLS.filter((s) => s.permissionLevel === 1).length,
    2: SKILLS.filter((s) => s.permissionLevel === 2).length,
    3: SKILLS.filter((s) => s.permissionLevel === 3).length,
  };
  const hardwareSkills = SKILLS.filter((s) => s.domain === "hardware").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>System</h2>
        <p className="empty-state">
          Overview of what JARVIS actually is right now — real counts and real status only, no
          simulated subsystems.
        </p>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <h3 className="panel-title">App</h3>
          <div className="status-row">
            <span>Version</span>
            <span>{APP_VERSION}</span>
          </div>
          <div className="status-row">
            <span>Build</span>
            <span>{import.meta.env.DEV ? "Development" : "Production"}</span>
          </div>
          <div className="status-row">
            <span>Runtime</span>
            <span>{inTauri ? "Tauri desktop app" : "Browser preview"}</span>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Performance</h3>
          {!inTauri ? (
            <p className="empty-state">Needs the desktop app — not available in a browser preview.</p>
          ) : statsError ? (
            <p className="empty-state">
              Couldn't read system stats — Milestone 37's Rust command may not be built yet.
            </p>
          ) : !stats ? (
            <p className="empty-state">Loading…</p>
          ) : (
            <>
              <div className="status-row">
                <span>CPU</span>
                <span>{stats.cpu_percent.toFixed(1)}%</span>
              </div>
              <div className="status-row">
                <span>Memory</span>
                <span>
                  {stats.memory_used_gb.toFixed(1)} / {stats.memory_total_gb.toFixed(1)} GB
                </span>
              </div>
              <div className="status-row">
                <span>Disk</span>
                <span>
                  {stats.disk_used_gb.toFixed(1)} / {stats.disk_total_gb.toFixed(1)} GB
                </span>
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Permissions</h3>
          <p className="empty-state" style={{ marginBottom: "var(--space-2)" }}>
            Every Skill is classified Level 1-3 (docs/SECURITY.md); Level 3 requires your explicit
            approval every time, no exceptions.
          </p>
          <div className="status-row">
            <span>Level 1 — read-only</span>
            <span>{skillsByLevel[1]}</span>
          </div>
          <div className="status-row">
            <span>Level 2 — workspace writes</span>
            <span>{skillsByLevel[2]}</span>
          </div>
          <div className="status-row">
            <span>Level 3 — needs approval</span>
            <span>{skillsByLevel[3]}</span>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-title">Connections</h3>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : (
            <div className="status-row">
              <span>Registered</span>
              <span>{connections.length}</span>
            </div>
          )}
          <button className="jc-btn-inline" style={{ marginTop: "var(--space-3)" }} onClick={() => onNavigate("Connections")}>
            Open Connections →
          </button>
        </div>

        <div className="panel">
          <h3 className="panel-title">Activity</h3>
          {loading ? (
            <p className="empty-state">Loading…</p>
          ) : recentActivity.length === 0 ? (
            <p className="empty-state">Nothing logged yet.</p>
          ) : (
            <ul className="status-list">
              {recentActivity.map((e) => (
                <li key={e.id} className="status-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span>{e.summary}</span>
                  <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button className="jc-btn-inline" style={{ marginTop: "var(--space-3)" }} onClick={() => onNavigate("Activity")}>
            Open Activity →
          </button>
        </div>

        <div className="panel">
          <h3 className="panel-title">Devices</h3>
          <p className="empty-state">
            {hardwareSkills === 0
              ? "No hardware connected. JARVIS's Skill system supports hardware Skills " +
                "(domain: \"hardware\", see skills/registry.ts), but none exist yet — " +
                "nothing to show until a real device (3D printer, robotic arm, etc.) is named."
              : `${hardwareSkills} hardware Skill${hardwareSkills === 1 ? "" : "s"} registered.`}
          </p>
        </div>
      </div>
    </div>
  );
}
