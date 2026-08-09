import { THEMES, type Theme } from "./hooks/useTheme";

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

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/[.!?]+$/, "");
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
    const nameMatch = input.trim().match(/^(?:delete|remove) project\s+(.+)$/i);
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
  const researchMatch = input.trim().match(/^research\s+(.+)$/i);
  if (researchMatch) {
    return { kind: "research", topic: researchMatch[1].trim() };
  }

  // "continue project <name>" -- Milestone 11: spec §62's "Continue
  // Project X" workflow, routed through the same orchestrator rather than
  // JARVIS inventing its own version of what a local Claude Code session
  // already does when asked directly.
  const continueMatch = input.trim().match(/^continue project\s+(.+)$/i);
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

  return { kind: "unknown", raw: input };
}

export interface CommandContext {
  setTheme: (theme: Theme) => void;
  /** Milestone 10: runs a prompt through the local orchestrator (Tauri ->
   * `claude` CLI) and resolves with its text result. Injected rather than
   * imported directly so commandEngine.ts stays testable without Tauri. */
  runOrchestrator?: (prompt: string) => Promise<string>;
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
      return "Nothing is wired to real status yet — every integration on the System Status panel reads NOT WIRED YET, honestly.";
    case "help":
      return "I can switch themes (e.g. \"switch to neon void\"), report status, \"research <topic>\", \"continue project <name>\", \"check my calendar\", and \"check my email\" — the last four via the local orchestrator. Everything else in the spec isn't built yet — see ROADMAP.md.";
    case "delete-project":
      return `"Delete project ${command.name}" is a Level 3 action and needs a real approval dialog, not a typed command — use the Delete button in the Projects view instead.`;
    case "research":
      return runOrchestratorOrExplain(
        ctx,
        `Research: ${command.topic}. Write findings as a new note in the Obsidian vault's Notes/ folder, then reply with one sentence summarizing what you found and the note's file path.`
      );
    case "continue-project":
      return runOrchestratorOrExplain(
        ctx,
        `Continue working on the "${command.name}" project (spec §62 workflow): load its context ` +
          `(roadmap, tasks, recent activity), inspect the actual repo state, decide the next concrete ` +
          `step, implement it, test it, update docs/changelog to match, then reply with 2-3 sentences ` +
          `summarizing what you did.`
      );
    case "check-calendar":
      return runOrchestratorOrExplain(
        ctx,
        `Check my calendar for today and the next couple of days using the Calendar MCP tools ` +
          `already configured locally, then reply with 2-3 sentences summarizing what's coming up. ` +
          `Read-only — don't create, modify, or respond to any events.`
      );
    case "check-email":
      return runOrchestratorOrExplain(
        ctx,
        `Check my email inbox using the Gmail MCP tools already configured locally for anything ` +
          `urgent or unread that needs my attention, then reply with 2-3 sentences summarizing it. ` +
          `Read-only — don't send, draft, or label anything.`
      );
    case "unknown":
      return `Not implemented yet: "${command.raw}". See ROADMAP.md for what's actually built.`;
  }
}

/**
 * Shared by every command that routes through the local orchestrator
 * (research, continue-project, check-calendar, check-email) so the "no
 * connection" / error-handling logic exists in exactly one place instead
 * of being copy-pasted per command.
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
