import type { Skill, SkillContext } from "./types";

/**
 * Milestone 31 — the six real Skills, ported behavior-identical from
 * commandEngine.ts's old inline switch statement (same prompts, same
 * error handling, same fallback-mode background/sync logic for
 * continue-project). This is now the single source of truth: permission
 * levels (permissions.ts), the descriptive UI registry
 * (lib/store/builtinSkills.ts), and App.tsx's SKILL_COMMAND_KINDS all
 * derive from this list instead of repeating it by hand.
 */

async function runOrchestratorOrExplain(ctx: SkillContext, prompt: string): Promise<string> {
  if (!ctx.runOrchestrator) {
    return "That needs the desktop app's orchestrator connection, which isn't available here.";
  }
  try {
    return await ctx.runOrchestrator(prompt);
  } catch (e) {
    return `Orchestrator error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export const SKILLS: Skill[] = [
  {
    id: "research",
    name: "Research",
    description:
      "Look into a topic and write findings as a new note in the Obsidian vault, mentioning " +
      "the active project if one is set.",
    permissionLevel: 1,
    domain: "software",
    connectionIds: ["web", "obsidian"],
    async execute(ctx, input) {
      const topic = String(input ?? "");
      const projectContext = ctx.activeProject
        ? ` This research is for the "${ctx.activeProject.name}" project -- mention that project ` +
          `by name near the top of the note and in your reply, so it's clear what it's for.`
        : "";
      return runOrchestratorOrExplain(
        ctx,
        `Research: ${topic}. Write findings as a new note in the Obsidian vault's Notes/ ` +
          `folder.${projectContext} Then reply with one sentence summarizing what you found and ` +
          `the note's file path.`
      );
    },
  },
  {
    id: "continue-project",
    name: "Continue Project",
    description:
      "Load a project's context, inspect its repo, implement the next concrete step, test it, " +
      "and update docs. Runs in the background (claude --bg).",
    permissionLevel: 2,
    domain: "software",
    connectionIds: [],
    async execute(ctx, input) {
      const name = String(input ?? "");
      const prompt =
        `Continue working on the "${name}" project (spec §62 workflow): load its context ` +
        `(roadmap, tasks, recent activity), inspect the actual repo state, decide the next concrete ` +
        `step, implement it, test it, update docs/changelog to match, then reply with 2-3 sentences ` +
        `summarizing what you did.`;
      if (!ctx.runOrchestratorBackground) {
        return runOrchestratorOrExplain(ctx, prompt);
      }
      try {
        const job = await ctx.runOrchestratorBackground(prompt);
        return (
          `Started continuing "${name}" as a background job (${job.jobId}) -- this can ` +
          `take a while, I'll let you know when it's done.`
        );
      } catch (e) {
        return `Orchestrator error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  },
  {
    id: "check-calendar",
    name: "Check Calendar",
    description: "Read-only summary of upcoming calendar events.",
    permissionLevel: 1,
    domain: "software",
    connectionIds: ["calendar"],
    async execute(ctx) {
      return runOrchestratorOrExplain(
        ctx,
        `Check my calendar for today and the next couple of days using the Calendar MCP tools ` +
          `already configured locally, then reply with 2-3 sentences summarizing what's coming up. ` +
          `Read-only — don't create, modify, or respond to any events.`
      );
    },
  },
  {
    id: "check-email",
    name: "Check Email",
    description: "Read-only summary of anything urgent or unread in the inbox.",
    permissionLevel: 1,
    domain: "software",
    connectionIds: ["gmail"],
    async execute(ctx) {
      return runOrchestratorOrExplain(
        ctx,
        `Check my email inbox using the Gmail MCP tools already configured locally for anything ` +
          `urgent or unread that needs my attention, then reply with 2-3 sentences summarizing it. ` +
          `Read-only — don't send, draft, or label anything.`
      );
    },
  },
  {
    id: "check-github",
    name: "Check GitHub",
    description: "Read-only summary of open PRs or issues assigned to you.",
    permissionLevel: 1,
    domain: "software",
    connectionIds: ["github"],
    async execute(ctx) {
      return runOrchestratorOrExplain(
        ctx,
        `Check GitHub for any open PRs or issues assigned to me, using the gh CLI (already ` +
          `authenticated locally), then reply with 2-3 sentences summarizing what needs attention. ` +
          `Read-only — don't create, comment on, merge, or close anything.`
      );
    },
  },
  {
    id: "check-memory",
    name: "Check Memory",
    description: "Read-only summary of recent activity in the Obsidian vault.",
    permissionLevel: 1,
    domain: "software",
    connectionIds: ["obsidian"],
    async execute(ctx) {
      return runOrchestratorOrExplain(
        ctx,
        `Look at the Obsidian vault at ~/Documents/Obsidian Vault -- check Daily/, Inbox/, and ` +
          `Notes/ for anything from the last few days, then reply with 2-3 sentences summarizing ` +
          `what's there and flagging anything in Inbox/ that looks unprocessed. Read-only -- ` +
          `don't create, modify, or delete any notes.`
      );
    },
  },
];

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}
