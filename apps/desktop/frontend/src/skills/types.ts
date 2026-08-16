/**
 * Milestone 31 — Skills engine redesign. Replaces three separate,
 * hand-synced declarations (commandEngine.ts's switch statement,
 * permissions.ts's permissionLevelFor, lib/store/builtinSkills.ts's
 * descriptive registry) with one Skill definition per skill that drives
 * all three. See skills/registry.ts for the actual list.
 *
 * `domain` exists so a hardware Skill (3D printer, robotic arm — see
 * VISION.md's "workshop partner" pillar) has a real place to slot into
 * later, with the same permission-level/approval machinery software
 * Skills already use. No hardware Skill is defined yet — there's no
 * driver, no connection, nothing to run. Adding one here without a real
 * device behind it would be exactly the "renders but isn't connected"
 * mistake this project's own discipline (see docs/ARCHITECTURE.md) rules out.
 */

/** Same three Connection contexts a Skill can execute in as commands
 * already route through (see commandEngine.ts's CommandContext, which
 * this narrows to just what Skill execution needs). */
export interface SkillContext {
  runOrchestrator?: (prompt: string) => Promise<string>;
  runOrchestratorBackground?: (prompt: string) => Promise<{ jobId: string; sessionId: string }>;
  activeProject?: { name: string } | null;
}

export type SkillDomain = "software" | "hardware";

export interface Skill {
  id: string;
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3;
  domain: SkillDomain;
  /** Connection ids from lib/store/builtinConnections.ts this Skill is
   * allowed to use. Empty when the Skill doesn't go through a registered
   * Connection (e.g. continue-project uses the local filesystem/git
   * directly). */
  connectionIds: string[];
  /** `input` is untyped here since Skills take different shapes (a topic
   * string, a project name, or nothing) — commandEngine.ts's per-command
   * cases pass the right shape for each skill id, same responsibility it
   * already had. */
  execute(ctx: SkillContext, input?: unknown): Promise<string>;
}
