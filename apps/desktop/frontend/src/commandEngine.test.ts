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
});

describe("executeCommand", () => {
  it("calls setTheme and returns a short confirmation", () => {
    const setTheme = vi.fn();
    const response = executeCommand(
      { kind: "switch-theme", theme: "obsidian" },
      { setTheme }
    );
    expect(setTheme).toHaveBeenCalledWith("obsidian");
    expect(response).toContain("obsidian");
  });

  it("never claims an unbuilt feature works", () => {
    const response = executeCommand(
      { kind: "unknown", raw: "deploy to production" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/not implemented/i);
  });
});
