/**
 * Permission levels from the spec (§54): three tiers, decided once
 * here rather than re-litigated per feature.
 *
 * Level 1 (safe)      — read, search, analyze, summarize, recommend. Generally allowed.
 * Level 2 (workspace) — create/update a project or task, edit docs. Traceable, not gated.
 * Level 3 (sensitive) — delete, send, deploy, publish, purchase, change security settings.
 *                        Requires an explicit approval per action, every time (§55).
 */
export type PermissionLevel = 1 | 2 | 3;

export interface ApprovalRequest {
  action: string;
  context: string;
  reason: string;
  risk: string;
}

/**
 * Classifies a command engine intent by permission level. Kept as a
 * single lookup so adding a new command means deciding its level here,
 * not scattering that judgment call across handler code.
 */
export function permissionLevelFor(kind: string): PermissionLevel {
  switch (kind) {
    case "delete-project":
      return 3;
    case "switch-theme":
    case "system-status":
    case "help":
    case "research":
    case "check-calendar":
    case "check-email":
    case "check-github":
    case "ask":
      // Read/search/summarize, explicitly scoped as read-only (or, for
      // "ask", read-only-by-prompt: told not to take action, only to
      // describe and ask for confirmation) in what commandEngine.ts sends
      // the orchestrator -- Level 1 per the table above.
      return 1;
    case "continue-project":
      // Writes code and docs in a project repo -- not sensitive in the
      // Level 3 sense (no delete/send/deploy/purchase), but not read-only
      // either. Level 2: traceable via the orchestrator's session id and
      // the repo's own git history, not gated per-action.
      return 2;
    default:
      // Unknown commands do nothing, so there's nothing to gate --
      // but default to the strictest level on principle, in case this
      // ever gets called for a command kind that does do something.
      return 3;
  }
}
