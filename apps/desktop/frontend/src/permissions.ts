/**
 * Permission levels from the spec (§54): three tiers, decided once
 * here rather than re-litigated per feature.
 *
 * Level 1 (safe)      — read, search, analyze, summarize, recommend. Generally allowed.
 * Level 2 (workspace) — create/update a project or task, edit docs. Traceable, not gated.
 * Level 3 (sensitive) — delete, send, deploy, publish, purchase, change security settings.
 *                        Requires an explicit approval per action, every time (§55).
 */
import { getSkill } from "./skills/registry";

export type PermissionLevel = 1 | 2 | 3;

export interface ApprovalRequest {
  action: string;
  context: string;
  reason: string;
  risk: string;
}

/**
 * Classifies a command engine intent by permission level. Non-Skill
 * command kinds (theme/status/help/ask, all Level 1; delete-project,
 * Level 3 with its own dedicated approval flow — see commandEngine.ts)
 * are decided here directly. Skill kinds (research, continue-project,
 * check-*) delegate to skills/registry.ts, which is now the single
 * source of truth for their level — Milestone 31 removed the prior
 * hand-duplication between this file and lib/store/builtinSkills.ts.
 */
export function permissionLevelFor(kind: string): PermissionLevel {
  switch (kind) {
    case "delete-project":
      return 3;
    case "switch-theme":
    case "system-status":
    case "help":
    case "ask":
      return 1;
    default: {
      const skill = getSkill(kind);
      if (skill) {
        return skill.permissionLevel;
      }
      // Unknown commands do nothing, so there's nothing to gate -- but
      // default to the strictest level on principle, in case this ever
      // gets called for a command kind that does do something.
      return 3;
    }
  }
}
