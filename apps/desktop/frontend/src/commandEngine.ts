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

  if (
    text === "help" ||
    text === "what can you do" ||
    text === "what can you do?"
  ) {
    return { kind: "help" };
  }

  return { kind: "unknown", raw: input };
}

export interface CommandContext {
  setTheme: (theme: Theme) => void;
}

/**
 * Executes a parsed command and returns the text response to show/speak.
 * Per spec §33, this should stay short — full detail belongs on screen,
 * not crammed into the spoken/echoed response.
 */
export function executeCommand(command: Command, ctx: CommandContext): string {
  switch (command.kind) {
    case "switch-theme":
      ctx.setTheme(command.theme);
      return `Switched to ${command.theme.replace("-", " ")}.`;
    case "system-status":
      return "Nothing is wired to real status yet — every integration on the System Status panel reads NOT WIRED YET, honestly.";
    case "help":
      return "Right now I can only switch themes (e.g. \"switch to neon void\") and report status. Everything else in the spec isn't built yet — see ROADMAP.md.";
    case "unknown":
      return `Not implemented yet: "${command.raw}". See ROADMAP.md for what's actually built.`;
  }
}
