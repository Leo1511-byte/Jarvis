/**
 * Honest placeholder for nav sections that don't have a real view yet
 * (Memory, Research, Agents, Automations, Integrations, Activity,
 * Notifications, System, Settings). Better than either hiding the nav
 * item or showing the Dashboard underneath it, which would misrepresent
 * what's actually built (spec principle #6).
 */
export function NotBuiltView({ section }: { section: string }) {
  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <h3 className="panel-title">{section}</h3>
      <p className="empty-state">
        Not built yet. Check ROADMAP.md for which milestone covers this.
      </p>
    </div>
  );
}
