/**
 * Milestone 24 (Skills data model) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md.
 *
 * A deliberate, documented scope decision: this is a *descriptive registry*
 * of the six commands `commandEngine.ts` already runs (research,
 * continue-project, check-calendar, check-email, check-github,
 * check-memory) -- not a rewrite of them. The plan's original wording
 * ("migrate the 6 existing commands to data-driven") could mean moving the
 * actual prompt templates into this table and having `executeCommand` read
 * from it at runtime. That was deliberately NOT done here: those six
 * prompts are proven, unit-tested, and (per TASKS.md) live-confirmed in
 * the real app -- rewriting `commandEngine.ts`'s switch statement to be
 * data-driven is exactly the kind of "must not regress 42 passing tests
 * or live-confirmed command behavior" risk the plan itself flagged for
 * this milestone. `commandEngine.ts` is untouched by this file.
 *
 * What this registry *does* deliver, which is the real point of Skills
 * per the spec: a queryable list of what Skills exist, their permission
 * level (matching permissions.ts exactly), and which Connections each is
 * allowed to use -- the least-privilege data Milestone 25 (Skills UI) and
 * Milestone 28 (skill-aware permission enforcement) need. If a future
 * milestone wants prompt templates to actually live here and drive
 * execution, that's a distinct, separately-scoped change -- not implied
 * by this one.
 */
export interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3;
  /** Connection ids from builtinConnections.ts this Skill is allowed to
   * use. Empty for continue-project -- it operates on the local
   * filesystem/git directly, which isn't one of the six registered
   * Connections; leaving it empty is more honest than forcing a
   * mapping that doesn't really fit. */
  connectionIds: string[];
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: "research",
    name: "Research",
    description:
      "Look into a topic and write findings as a new note in the Obsidian vault, mentioning " +
      "the active project if one is set.",
    permissionLevel: 1,
    connectionIds: ["web", "obsidian"],
  },
  {
    id: "continue-project",
    name: "Continue Project",
    description:
      "Load a project's context, inspect its repo, implement the next concrete step, test it, " +
      "and update docs. Runs in the background (claude --bg).",
    permissionLevel: 2,
    connectionIds: [],
  },
  {
    id: "check-calendar",
    name: "Check Calendar",
    description: "Read-only summary of upcoming calendar events.",
    permissionLevel: 1,
    connectionIds: ["calendar"],
  },
  {
    id: "check-email",
    name: "Check Email",
    description: "Read-only summary of anything urgent or unread in the inbox.",
    permissionLevel: 1,
    connectionIds: ["gmail"],
  },
  {
    id: "check-github",
    name: "Check GitHub",
    description: "Read-only summary of open PRs or issues assigned to you.",
    permissionLevel: 1,
    connectionIds: ["github"],
  },
  {
    id: "check-memory",
    name: "Check Memory",
    description: "Read-only summary of recent activity in the Obsidian vault.",
    permissionLevel: 1,
    connectionIds: ["obsidian"],
  },
];
