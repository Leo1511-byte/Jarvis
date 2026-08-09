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
});
