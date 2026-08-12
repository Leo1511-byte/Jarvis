import { THEMES, type Theme } from "./hooks/useTheme";
import { getSkill } from "./skills/registry";
import type { SkillContext } from "./skills/types";
import type { ApprovalRequest } from "./permissions";

/**
 * Command engine — Milestone 5. Parses free-text (voice STT or typed,
 * per spec §32: same engine for both, no separate behaviors) into a
 * small set of real intents. Deliberately keyword/pattern based, not a
 * claim of full NLU — spec §21 says "do not require rigid syntax," not
 * "pretend to understand everything." Anything unrecognized returns an
 * honest "unknown" result rather than a fabricated action.
 */

export type Command =
  | { kind: "switch-theme"; theme: Theme }
  | { kind: "system-status" }
  | { kind: "help" }
  | { kind: "delete-project"; name: string }
  | { kind: "research"; topic: string }
  | { kind: "continue-project"; name: string }
  | { kind: "check-calendar" }
  | { kind: "check-email" }
  | { kind: "check-github" }
  | { kind: "check-memory" }
  | { kind: "ask"; text: string }
  | { kind: "unknown"; raw: string };

const THEME_ALIASES: Record<string, Theme> = {
  "crimson command": "crimson-command",
  crimson: "crimson-command",
  "neon void": "neon-void",
  neon: "neon-void",
  "holographic core": "holographic-core",
  holographic: "holographic-core",
  hologram: "holographic-core",
  obsidian: "obsidian",
};

const WAKE_PHRASE = /^(?:hey |ok |okay )?jarvis[,]?\s+/i;

function normalize(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/[.!?]+$/, "");
  // Voice transcripts sometimes include the wake phrase itself, not just
  // the command after it -- hit live 2026-08-10: saying "Hey Jarvis,
  // status" transcribed as "hey jarvis status" (or with the comma kept),
  // which matched no pattern below and fell through to "not implemented
  // yet". Strip a leading "(hey/ok/okay) jarvis" here so voice and typed
  // input both parse the same way either way it comes in.
  return trimmed.replace(WAKE_PHRASE, "");
}

/** Same wake-phrase strip as normalize(), but preserving original casing --
 * used wherever a name/topic is re-extracted from the raw input instead of
 * the lowercased `text` (delete-project/research/continue-project), so a
 * voice command like "Hey Jarvis, continue project Ape War" still finds
 * "Ape War" instead of failing to match at all. */
function stripWakePhrase(input: string): string {
  return input.trim().replace(WAKE_PHRASE, "");
}

export function parseCommand(input: string): Command {
  const text = normalize(input);

  if (!text) {
    return { kind: "unknown", raw: input };
  }

  // "switch to <theme>" / "switch theme to <theme>" / "use <theme> theme"
  const switchMatch = text.match(
    /^(?:switch(?: theme)? to|use|activate)\s+(.+?)(?:\s+theme)?$/
  );
  if (switchMatch) {
    const candidate = switchMatch[1].trim();
    const theme =
      THEME_ALIASES[candidate] ??
      (THEMES as readonly string[]).find((t) => t === candidate);
    if (theme) {
      return { kind: "switch-theme", theme: theme as Theme };
    }
  }

  if (/^(show )?system status$/.test(text) || text === "status") {
    return { kind: "system-status" };
  }

  // "delete project <name>" / "remove project <name>" -- recognized so it
  // classifies correctly under permissions.ts, but the command bar does not
  // execute this itself (see executeCommand below): a typed/spoken delete
  // has no confirmation surface here, and Level 3 actions require a real
  // approval dialog, not a one-line echoed response. The Projects view's
  // delete button is the actual, approval-gated path.
  // Matched case-insensitively against normalized text, but the captured
  // name comes from the original (trimmed) input so casing is preserved --
  // project names are looked up/displayed with their real casing.
  if (/^(?:delete|remove) project\s+.+$/.test(text)) {
    const nameMatch = stripWakePhrase(input).match(/^(?:delete|remove) project\s+(.+)$/i);
    if (nameMatch) {
      return { kind: "delete-project", name: nameMatch[1].trim() };
    }
  }

  if (
    text === "help" ||
    text === "what can you do" ||
    text === "what can you do?"
  ) {
    return { kind: "help" };
  }

  // "research <topic>" -- Milestone 10/16's first real slice: routes
  // through the local orchestrator (the `claude` CLI, shelled out to from
  // the Rust backend) instead of being answered by pattern-matching here.
  const researchMatch = stripWakePhrase(input).match(/^research\s+(.+)$/i);
  if (researchMatch) {
    return { kind: "research", topic: researchMatch[1].trim() };
  }

  // "continue project <name>" -- Milestone 11: spec §62's "Continue
  // Project X" workflow, routed through the same orchestrator rather than
  // JARVIS inventing its own version of what a local Claude Code session
  // already does when asked directly.
  const continueMatch = stripWakePhrase(input).match(/^continue project\s+(.+)$/i);
  if (continueMatch) {
    return { kind: "continue-project", name: continueMatch[1].trim() };
  }

  // "check my calendar" / "what's on my calendar" -- Milestone 14. The
  // Calendar MCP server is verified working in the local runtime (see
  // MCP_SETUP.md); this just gives it a command bar entry point via the
  // orchestrator, rather than JARVIS calling it directly (no calendar MCP
  // client exists in the Rust/frontend code, and shouldn't -- the local
  // `claude` CLI already has it configured).
  if (/^(?:check |show |what'?s on )?(?:my )?calendar\??$/.test(text)) {
    return { kind: "check-calendar" };
  }

  // "check my email" / "check my inbox" -- Milestone 15, same pattern as
  // calendar above via the Gmail MCP server already verified locally.
  if (/^check (?:my )?(?:email|inbox|mail)$/.test(text)) {
    return { kind: "check-email" };
  }

  // "check my github" / "check my prs" / "check my issues" -- Milestone 12.
  // No GitHub MCP server is configured locally (unlike Calendar/Gmail), but
  // none is needed: the local `claude` CLI already has bash/tool access,
  // and `gh auth status` is verified working (see TASKS.md), so the
  // orchestrator prompt just asks it to use `gh` directly.
  if (/^check (?:my )?(?:github|prs?|pull requests?|issues?)$/.test(text)) {
    return { kind: "check-github" };
  }

  // "check my memory" / "what's in my memory" / "check my notes" -- closes
  // the last real "not linked" gap Leonardo flagged live 2026-08-11: the
  // Obsidian vault (Milestone 6, built and real since 2026-08-09) had no
  // way to reach it from the app at all -- StatusPanel honestly showed
  // "NOT WIRED YET" because nothing in the app talked to it. Same pattern
  // as check-calendar/check-email: no new Rust, no vault-reading code in
  // this app at all -- the local `claude` CLI already has direct
  // filesystem access to the vault via its own tools, so the orchestrator
  // prompt just asks it to look.
  if (/^(?:check |show |what'?s in )?(?:my )?(?:memory|notes)\??$/.test(text)) {
    return { kind: "check-memory" };
  }

  // Anything else -- hit live 2026-08-10: Leonardo asking JARVIS ordinary
  // questions/conversation got a hardcoded "not implemented yet" instead
  // of ever reaching Claude, since every case above is a rigid pattern
  // match with no general fallback. Route it through the orchestrator as
  // a direct message instead of silently doing nothing -- see the "ask"
  // case in executeCommand for how this stays read-only-by-prompt rather
  // than letting arbitrary spoken/typed text trigger real actions.
  return { kind: "ask", text: stripWakePhrase(input).trim() };
}

export interface CommandContext {
  setTheme: (theme: Theme) => void;
  /** Milestone 10: runs a prompt through the local orchestrator (Tauri ->
   * `claude` CLI) and resolves with its text result. Injected rather than
   * imported directly so commandEngine.ts stays testable without Tauri. */
  runOrchestrator?: (prompt: string) => Promise<string>;
  /** Milestone 10, background-mode slice: starts a long-running orchestrator
   * turn (`claude --bg`) without blocking on it. Resolves once the job is
   * *launched*, not once it's done -- executeCommand's own return stays a
   * single immediate string like every other command. The caller (App.tsx)
   * uses the returned ids to poll for completion and deliver the real
   * result separately. Used by continue-project, the one command whose
   * spec §62 workflow can genuinely take a while; the four read-only
   * commands above stay on the synchronous path. */
  runOrchestratorBackground?: (prompt: string) => Promise<{ jobId: string; sessionId: string }>;
  /** Milestone 16 follow-up: whichever project is currently selected as
   * "active" (see hooks/useActiveProject.ts), resolved down to just the
   * name so commandEngine.ts doesn't need the store's shape. `research`
   * uses this to link findings back to a project instead of always
   * writing to the vault-wide Notes/ folder with no association -- the
   * gap ROADMAP.md's M16 row named explicitly. Undefined/null (no active
   * project set, or the caller didn't wire this up, e.g. in tests) falls
   * back to the original unscoped behavior unchanged. */
  activeProject?: { name: string } | null;
  /** Milestone 38: the same promise-based approval flow (spec §55) the
   * Level 3 Skill gate in App.tsx already uses -- injected here so the
   * "ask" case below can gate a real action on it too. Optional so
   * commandEngine.ts stays testable without wiring a real dialog; if
   * omitted, "ask" falls back to describing rather than acting (see
   * runAsk's comment). */
  requestApproval?: (req: ApprovalRequest) => Promise<boolean>;
}

/**
 * Executes a parsed command and returns the text response to show/speak.
 * Per spec §33, this should stay short — full detail belongs on screen,
 * not crammed into the spoken/echoed response.
 */
export async function executeCommand(
  command: Command,
  ctx: CommandContext
): Promise<string> {
  switch (command.kind) {
    case "switch-theme":
      ctx.setTheme(command.theme);
      return `Switched to ${command.theme.replace("-", " ")}.`;
    case "system-status":
      return "Claude, Voice, Supabase, GitHub, and Obsidian all reach the app now — see the System Status panel for exact per-system state.";
    case "help":
      return "I can switch themes (e.g. \"switch to neon void\"), report status, \"research <topic>\", \"continue project <name>\", \"check my calendar\", \"check my email\", \"check my github\", and \"check my memory\" — the last six via the local orchestrator. Anything else, I'll ask Claude directly — if fulfilling it well means actually changing something, I'll describe the plan and ask you to approve it first.";
    case "delete-project":
      return `"Delete project ${command.name}" is a Level 3 action and needs a real approval dialog, not a typed command — use the Delete button in the Projects view instead.`;
    case "research":
      return runSkill("research", ctx, command.topic);
    case "continue-project":
      return runSkill("continue-project", ctx, command.name);
    case "check-calendar":
      return runSkill("check-calendar", ctx);
    case "check-email":
      return runSkill("check-email", ctx);
    case "check-github":
      return runSkill("check-github", ctx);
    case "check-memory":
      return runSkill("check-memory", ctx);
    case "ask":
      return runAsk(command.text, ctx);
    case "unknown":
      return `Not implemented yet: "${command.raw}". See ROADMAP.md for what's actually built.`;
  }
}

/**
 * Shared by the one command that routes through the orchestrator but
 * isn't a named Skill ("ask" — see skills/registry.ts for the six that
 * are) so the "no connection" / error-handling logic exists in exactly
 * one place instead of being copy-pasted.
 */
async function runOrchestratorOrExplain(ctx: CommandContext, prompt: string): Promise<string> {
  if (!ctx.runOrchestrator) {
    return "That needs the desktop app's orchestrator connection, which isn't available here.";
  }
  try {
    return await ctx.runOrchestrator(prompt);
  } catch (e) {
    return `Orchestrator error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/**
 * Milestone 31: looks up a Skill in the registry and executes it, passing
 * through the same CommandContext fields Skills need (SkillContext is a
 * narrower shape). Skill ids are only ever passed here from the switch
 * above, all of which have a matching registry entry -- if that ever
 * drifts, fail honestly instead of throwing.
 */
async function runSkill(id: string, ctx: CommandContext, input?: unknown): Promise<string> {
  const skill = getSkill(id);
  if (!skill) {
    return `Skill "${id}" isn't registered. See skills/registry.ts.`;
  }
  const skillCtx: SkillContext = {
    runOrchestrator: ctx.runOrchestrator,
    runOrchestratorBackground: ctx.runOrchestratorBackground,
    activeProject: ctx.activeProject,
  };
  return skill.execute(skillCtx, input);
}

const SAFE_PREFIX = "SAFE:";
const NEEDS_APPROVAL_PREFIX = "NEEDS_APPROVAL:";

/**
 * Milestone 38 — "do anything it has access to": "ask" (the fallback for
 * anything that doesn't match a built-in Skill) used to be permanently
 * describe-only, per its old prompt ("this is not authorization to take
 * action"). This extends it to actually act, but gated the same way the
 * six built-in Skills' Level 3 case is (App.tsx's approval dialog) --
 * not a new permission system, an application of the existing one to
 * requests that don't have a pre-reviewed Skill behind them.
 *
 * Two-call design, since there's no registry entry to read a permission
 * level from ahead of time the way runSkill() has:
 *   1. Ask the orchestrator to classify its own response: reply prefixed
 *      "SAFE:" if answering only requires reading/analyzing/explaining
 *      (nothing changes), or "NEEDS_APPROVAL:" with a concrete plan if
 *      fulfilling the request well would mean actually changing
 *      something. Deliberately binary (not Level 1/2/3) -- for a
 *      pre-reviewed Skill prompt we can trust the declared level, but
 *      for arbitrary free text interpreted by the model in the moment,
 *      treating any real change as needing approval is the safer default
 *      than trying to also guess "traceable, not gated" (Level 2) via
 *      self-classification.
 *   2. If NEEDS_APPROVAL and the user approves (same ApprovalDialog
 *      Level 3 Skills use), a second, independent prompt tells the
 *      orchestrator to actually do what it described.
 *
 * Honesty caveat, not swept under the rug: this is a behavioral
 * guardrail via prompting, not a hard technical sandbox. A single `claude
 * -p` call has real tool access and nothing here can force it to
 * genuinely refrain from acting before the "SAFE:"/"NEEDS_APPROVAL:"
 * classification -- it's asked to, the same way the old prompt asked it
 * to just describe, not physically prevented. If the model doesn't
 * follow the format at all, this falls back to treating the raw reply as
 * the final answer (matches the old behavior) rather than blocking on a
 * response it can't parse.
 */
async function runAsk(text: string, ctx: CommandContext): Promise<string> {
  const classifyPrompt =
    `Leonardo just said: "${text}". This didn't match any of my built-in commands, so treat it ` +
    `as a direct question or request.\n\n` +
    `If answering well only requires reading, searching, or explaining something -- nothing ` +
    `changes as a result -- just answer normally, and start your reply with "${SAFE_PREFIX}".\n\n` +
    `If fulfilling this well would mean actually changing something (editing a file, sending ` +
    `something, running a command that writes/deletes/modifies anything), do NOT do it yet. ` +
    `Instead reply with "${NEEDS_APPROVAL_PREFIX}" followed by a short, concrete description of ` +
    `exactly what you would do -- specific enough that Leonardo can approve or reject it without ` +
    `guessing.`;

  const classification = await runOrchestratorOrExplain(ctx, classifyPrompt);

  if (classification.startsWith(NEEDS_APPROVAL_PREFIX)) {
    const plan = classification.slice(NEEDS_APPROVAL_PREFIX.length).trim();

    if (!ctx.requestApproval) {
      return (
        `This would need your approval to actually do, but there's no approval flow available ` +
        `here. What I'd do: ${plan}`
      );
    }

    const approved = await ctx.requestApproval({
      action: `Do: ${plan}`,
      context: `You asked: "${text}". This wasn't a known Skill, so JARVIS classified it as ` +
        `needing your approval before acting rather than executing it directly.`,
      reason:
        "Free-form requests that would change something get the same approval gate as a " +
        "Level 3 Skill -- there's no pre-reviewed prompt template to trust the way built-in " +
        "Skills have.",
      risk:
        "JARVIS interpreted your request itself; its judgment about what to do isn't " +
        "pre-vetted the way a built-in Skill's prompt is. Review the plan above before approving.",
    });

    if (!approved) {
      return "Not approved — nothing was run.";
    }

    return runOrchestratorOrExplain(
      ctx,
      `Leonardo approved this plan: "${plan}" (in response to: "${text}"). Go ahead and do it ` +
        `now, then reply with 2-3 sentences summarizing what you did.`
    );
  }

  if (classification.startsWith(SAFE_PREFIX)) {
    return classification.slice(SAFE_PREFIX.length).trim();
  }

  // Didn't follow the format -- honest fallback, same as the old
  // always-describe behavior: relay the raw reply rather than blocking.
  return classification;
}
