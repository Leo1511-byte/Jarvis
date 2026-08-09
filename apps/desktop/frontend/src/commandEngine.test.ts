import { describe, expect, it, vi } from "vitest";
import { parseCommand, executeCommand } from "./commandEngine";

describe("parseCommand", () => {
  it("parses theme switch commands with aliases", () => {
    expect(parseCommand("switch to neon void")).toEqual({
      kind: "switch-theme",
      theme: "neon-void",
    });
    expect(parseCommand("Switch to Crimson Command")).toEqual({
      kind: "switch-theme",
      theme: "crimson-command",
    });
    expect(parseCommand("use hologram")).toEqual({
      kind: "switch-theme",
      theme: "holographic-core",
    });
  });

  it("parses status and help", () => {
    expect(parseCommand("system status")).toEqual({ kind: "system-status" });
    expect(parseCommand("status")).toEqual({ kind: "system-status" });
    expect(parseCommand("help")).toEqual({ kind: "help" });
  });

  it("returns unknown for anything unrecognized, honestly", () => {
    expect(parseCommand("open ape war")).toEqual({
      kind: "unknown",
      raw: "open ape war",
    });
    expect(parseCommand("")).toEqual({ kind: "unknown", raw: "" });
  });

  it("recognizes delete-project intent without executing it", () => {
    expect(parseCommand("delete project Ape War")).toEqual({
      kind: "delete-project",
      name: "Ape War",
    });
    expect(parseCommand("remove project Ape War")).toEqual({
      kind: "delete-project",
      name: "Ape War",
    });
  });

  it("parses research commands", () => {
    expect(parseCommand("research quantum computing")).toEqual({
      kind: "research",
      topic: "quantum computing",
    });
  });

  it("parses continue-project commands", () => {
    expect(parseCommand("continue project Ape War")).toEqual({
      kind: "continue-project",
      name: "Ape War",
    });
  });

  it("parses calendar-check commands in their common phrasings", () => {
    expect(parseCommand("check my calendar")).toEqual({ kind: "check-calendar" });
    expect(parseCommand("check calendar")).toEqual({ kind: "check-calendar" });
    expect(parseCommand("what's on my calendar")).toEqual({ kind: "check-calendar" });
    expect(parseCommand("show my calendar")).toEqual({ kind: "check-calendar" });
  });

  it("parses email-check commands in their common phrasings", () => {
    expect(parseCommand("check my email")).toEqual({ kind: "check-email" });
    expect(parseCommand("check my inbox")).toEqual({ kind: "check-email" });
    expect(parseCommand("check my mail")).toEqual({ kind: "check-email" });
  });

  it("parses github-check commands in their common phrasings", () => {
    expect(parseCommand("check my github")).toEqual({ kind: "check-github" });
    expect(parseCommand("check my prs")).toEqual({ kind: "check-github" });
    expect(parseCommand("check my pull requests")).toEqual({ kind: "check-github" });
    expect(parseCommand("check my issues")).toEqual({ kind: "check-github" });
  });
});

describe("executeCommand", () => {
  it("calls setTheme and returns a short confirmation", async () => {
    const setTheme = vi.fn();
    const response = await executeCommand(
      { kind: "switch-theme", theme: "obsidian" },
      { setTheme }
    );
    expect(setTheme).toHaveBeenCalledWith("obsidian");
    expect(response).toContain("obsidian");
  });

  it("never claims an unbuilt feature works", async () => {
    const response = await executeCommand(
      { kind: "unknown", raw: "deploy to production" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/not implemented/i);
  });

  it("redirects delete-project to the real approval-gated UI instead of acting", async () => {
    const response = await executeCommand(
      { kind: "delete-project", name: "Ape War" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/level 3/i);
    expect(response).toContain("Ape War");
  });

  it("routes research through the injected orchestrator and returns its result", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Found 3 relevant papers.");
    const response = await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(
      expect.stringContaining("quantum computing")
    );
    expect(response).toBe("Found 3 relevant papers.");
  });

  it("reports an honest error if the orchestrator call fails", async () => {
    const runOrchestrator = vi.fn().mockRejectedValue(new Error("claude not found"));
    const response = await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(response).toMatch(/orchestrator error/i);
    expect(response).toContain("claude not found");
  });

  it("says research is unavailable without an orchestrator connection", async () => {
    const response = await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/isn't available/i);
  });

  it("routes continue-project through the orchestrator with the project name in the prompt", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Shipped the next task, tests passing.");
    const response = await executeCommand(
      { kind: "continue-project", name: "Ape War" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Ape War"));
    expect(response).toBe("Shipped the next task, tests passing.");
  });

  it("routes check-calendar through the orchestrator with a read-only prompt", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Two meetings today.");
    const response = await executeCommand(
      { kind: "check-calendar" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Read-only"));
    expect(response).toBe("Two meetings today.");
  });

  it("routes check-email through the orchestrator with a read-only prompt", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Nothing urgent.");
    const response = await executeCommand(
      { kind: "check-email" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Read-only"));
    expect(response).toBe("Nothing urgent.");
  });

  it("routes check-github through the orchestrator with a read-only prompt", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("2 PRs open, nothing urgent.");
    const response = await executeCommand(
      { kind: "check-github" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Read-only"));
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("gh"));
    expect(response).toBe("2 PRs open, nothing urgent.");
  });

  it("reports orchestrator errors consistently across every routed command", async () => {
    const runOrchestrator = vi.fn().mockRejectedValue(new Error("no session"));
    const response = await executeCommand(
      { kind: "check-calendar" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(response).toMatch(/orchestrator error/i);
    expect(response).toContain("no session");
  });
});
