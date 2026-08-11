import { useState } from "react";
import { executeCommand } from "../commandEngine";

/**
 * Milestone 6's vault (Inbox/Daily/Notes/Briefs/System, built and real
 * since 2026-08-09) finally gets a real way in from the app -- until now
 * this nav section was a NotBuiltView placeholder despite the vault
 * itself being genuine and working, which is what Leonardo flagged live
 * ("only obsidian isn't linked") 2026-08-11.
 *
 * Deliberately reuses the exact "check-memory" command path the command
 * bar/voice already use (see commandEngine.ts) instead of inventing
 * separate vault-reading logic here -- one code path for "ask JARVIS to
 * look at the vault," whether that ask comes from typing, speaking, or
 * clicking this button. No new Rust: same as Calendar/Email/GitHub, the
 * orchestrator's `claude` process already has direct filesystem access to
 * the vault through its own tools.
 */
export function MemoryView({
  runOrchestrator,
}: {
  runOrchestrator?: (prompt: string) => Promise<string>;
}) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkMemory() {
    setLoading(true);
    setResult(null);
    const response = await executeCommand(
      { kind: "check-memory" },
      { setTheme: () => {}, runOrchestrator }
    );
    setResult(response);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Memory</h2>
        <p className="empty-state">
          JARVIS's memory is a real Obsidian vault at ~/Documents/Obsidian Vault — not a database,
          not a placeholder concept. Inbox/ for capture, Daily/ for day notes, Notes/ for research
          and reference, Briefs/ for the morning brief. Built in Milestone 6; this view (and the
          "check my memory" command, typed or spoken) is the first real way to reach it from the
          app itself.
        </p>
      </div>

      <div className="panel" style={{ maxWidth: 560 }}>
        <h3 className="panel-title">Recent Activity</h3>
        <button type="button" className="jc-btn-inline" onClick={checkMemory} disabled={loading}>
          {loading ? "Checking…" : "Check recent memory"}
        </button>
        {result && (
          <p className="empty-state" style={{ marginTop: "var(--space-3)" }}>
            {result}
          </p>
        )}
        {!result && !loading && (
          <p className="empty-state" style={{ marginTop: "var(--space-3)" }}>
            Click above, or type/say "check my memory" anywhere in the app — same command either
            way.
          </p>
        )}
      </div>
    </div>
  );
}
