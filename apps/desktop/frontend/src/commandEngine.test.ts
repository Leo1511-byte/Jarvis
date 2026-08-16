import { describe, expect, it, vi } from "vitest";
import { parseCommand, executeCommand, runVoiceCommand, runVoiceCommandConfirmed } from "./commandEngine";

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

  it("strips a leading wake phrase so voice transcripts parse like typed input", () => {
    // Hit live 2026-08-10: saying "Hey Jarvis, status" transcribed with the
    // wake phrase included, which previously fell through to "unknown".
    expect(parseCommand("hey jarvis, status")).toEqual({ kind: "system-status" });
    expect(parseCommand("hey jarvis status")).toEqual({ kind: "system-status" });
    expect(parseCommand("Jarvis, status")).toEqual({ kind: "system-status" });
    expect(parseCommand("ok jarvis help")).toEqual({ kind: "help" });
    expect(parseCommand("hey jarvis, switch to neon void")).toEqual({
      kind: "switch-theme",
      theme: "neon-void",
    });
  });

  it("strips the wake phrase before extracting a case-preserved name/topic", () => {
    // These re-match against the original-cased input, not the lowercased
    // `text` -- a separate code path that needed its own wake-phrase strip
    // (see stripWakePhrase in commandEngine.ts).
    expect(parseCommand("Hey Jarvis, continue project Ape War")).toEqual({
      kind: "continue-project",
      name: "Ape War",
    });
    expect(parseCommand("Hey Jarvis, research Quantum Computing")).toEqual({
      kind: "research",
      topic: "Quantum Computing",
    });
    expect(parseCommand("Hey Jarvis, delete project Ape War")).toEqual({
      kind: "delete-project",
      name: "Ape War",
    });
  });

  it("falls back to ask for anything unrecognized, instead of doing nothing", () => {
    // Hit live 2026-08-10: ordinary questions/conversation got a hardcoded
    // "not implemented yet" instead of ever reaching Claude. "unknown" is
    // now only for genuinely empty input -- everything else becomes "ask".
    expect(parseCommand("open ape war")).toEqual({
      kind: "ask",
      text: "open ape war",
    });
    expect(parseCommand("what's the weather like")).toEqual({
      kind: "ask",
      text: "what's the weather like",
    });
    expect(parseCommand("")).toEqual({ kind: "unknown", raw: "" });
  });

  it("strips the wake phrase from ask commands too", () => {
    expect(parseCommand("Hey Jarvis, what's the weather like")).toEqual({
      kind: "ask",
      text: "what's the weather like",
    });
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

  it("parses self-upgrade commands, with and without a focus", () => {
    expect(parseCommand("upgrade yourself")).toEqual({ kind: "self-upgrade", focus: null });
    expect(parseCommand("update yourself")).toEqual({ kind: "self-upgrade", focus: null });
    expect(parseCommand("upgrade yourself: fix the memory index bug")).toEqual({
      kind: "self-upgrade",
      focus: "fix the memory index bug",
    });
    expect(parseCommand("upgrade yourself, fix the memory index bug")).toEqual({
      kind: "self-upgrade",
      focus: "fix the memory index bug",
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

  it("parses memory-check commands in their common phrasings", () => {
    expect(parseCommand("check my memory")).toEqual({ kind: "check-memory" });
    expect(parseCommand("what's in my memory")).toEqual({ kind: "check-memory" });
    expect(parseCommand("check my notes")).toEqual({ kind: "check-memory" });
    expect(parseCommand("memory")).toEqual({ kind: "check-memory" });
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

  it("mentions the active project in the research prompt when one is set", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Found 3 relevant papers.");
    await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn(), runOrchestrator, activeProject: { name: "Ape War Game" } }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Ape War Game"));
  });

  it("leaves the research prompt unscoped when there's no active project", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Found 3 relevant papers.");
    await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn(), runOrchestrator, activeProject: null }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.not.stringContaining("project"));
  });

  it("says research is unavailable without an orchestrator connection", async () => {
    const response = await executeCommand(
      { kind: "research", topic: "quantum computing" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/isn't available/i);
  });

  it("falls back to the synchronous orchestrator for continue-project without a background connection", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Shipped the next task, tests passing.");
    const response = await executeCommand(
      { kind: "continue-project", name: "Ape War" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Ape War"));
    expect(response).toBe("Shipped the next task, tests passing.");
  });

  it("routes continue-project through background mode when available, returning immediately", async () => {
    const runOrchestrator = vi.fn(); // must NOT be called -- background mode should take over
    const runOrchestratorBackground = vi
      .fn()
      .mockResolvedValue({ jobId: "84f90224", sessionId: "84f90224-0afe-4cb9-904e-774c6780bb06" });
    const response = await executeCommand(
      { kind: "continue-project", name: "Ape War" },
      { setTheme: vi.fn(), runOrchestrator, runOrchestratorBackground }
    );
    expect(runOrchestratorBackground).toHaveBeenCalledWith(expect.stringContaining("Ape War"));
    expect(runOrchestrator).not.toHaveBeenCalled();
    expect(response).toContain("84f90224");
    expect(response).toMatch(/background job/i);
  });

  it("reports an honest error if starting a background continue-project job fails", async () => {
    const runOrchestratorBackground = vi.fn().mockRejectedValue(new Error("claude --bg failed"));
    const response = await executeCommand(
      { kind: "continue-project", name: "Ape War" },
      { setTheme: vi.fn(), runOrchestratorBackground }
    );
    expect(response).toMatch(/orchestrator error/i);
    expect(response).toContain("claude --bg failed");
  });

  it("routes self-upgrade through background mode with the given focus", async () => {
    const runOrchestrator = vi.fn();
    const runOrchestratorBackground = vi
      .fn()
      .mockResolvedValue({ jobId: "abc123", sessionId: "abc123-session" });
    const response = await executeCommand(
      { kind: "self-upgrade", focus: "fix the memory index bug" },
      { setTheme: vi.fn(), runOrchestrator, runOrchestratorBackground }
    );
    expect(runOrchestratorBackground).toHaveBeenCalledWith(
      expect.stringContaining("fix the memory index bug")
    );
    expect(runOrchestrator).not.toHaveBeenCalled();
    expect(response).toContain("abc123");
    expect(response).toMatch(/background job/i);
  });

  it("lets self-upgrade pick its own focus when none is given", async () => {
    const runOrchestratorBackground = vi
      .fn()
      .mockResolvedValue({ jobId: "abc123", sessionId: "abc123-session" });
    await executeCommand(
      { kind: "self-upgrade", focus: null },
      { setTheme: vi.fn(), runOrchestratorBackground }
    );
    expect(runOrchestratorBackground).toHaveBeenCalledWith(
      expect.stringContaining("project/ROADMAP.md and project/TASKS.md")
    );
  });

  it("falls back to the synchronous orchestrator for self-upgrade without a background connection", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Fixed the bug, tests passing.");
    const response = await executeCommand(
      { kind: "self-upgrade", focus: "fix the memory index bug" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(
      expect.stringContaining("fix the memory index bug")
    );
    expect(response).toBe("Fixed the bug, tests passing.");
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

  it("routes check-memory through the orchestrator with a read-only vault prompt", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Nothing unprocessed in your inbox.");
    const response = await executeCommand(
      { kind: "check-memory" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Read-only"));
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Obsidian Vault"));
    expect(response).toBe("Nothing unprocessed in your inbox.");
  });

  it("routes ask through the orchestrator asking it to classify SAFE vs NEEDS_APPROVAL", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("SAFE: It's sunny where you are, I think.");
    const response = await executeCommand(
      { kind: "ask", text: "what's the weather like" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledWith(
      expect.stringContaining("what's the weather like")
    );
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("SAFE:"));
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("NEEDS_APPROVAL:"));
    expect(response).toBe("It's sunny where you are, I think.");
  });

  it("falls back to the raw reply if ask's classification doesn't follow the SAFE/NEEDS_APPROVAL format", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("It's sunny where you are, I think.");
    const response = await executeCommand(
      { kind: "ask", text: "what's the weather like" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(response).toBe("It's sunny where you are, I think.");
  });

  it("says ask is unavailable without an orchestrator connection", async () => {
    const response = await executeCommand(
      { kind: "ask", text: "what's the weather like" },
      { setTheme: vi.fn() }
    );
    expect(response).toMatch(/isn't available/i);
  });

  it("gates a NEEDS_APPROVAL ask behind the approval flow, then executes it once approved", async () => {
    const runOrchestrator = vi
      .fn()
      .mockResolvedValueOnce("NEEDS_APPROVAL: delete the file notes.txt")
      .mockResolvedValueOnce("Deleted notes.txt.");
    const requestApproval = vi.fn().mockResolvedValue(true);
    const response = await executeCommand(
      { kind: "ask", text: "delete notes.txt" },
      { setTheme: vi.fn(), runOrchestrator, requestApproval }
    );
    expect(requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("delete the file notes.txt") })
    );
    expect(runOrchestrator).toHaveBeenCalledTimes(2);
    expect(runOrchestrator).toHaveBeenLastCalledWith(
      expect.stringContaining("delete the file notes.txt")
    );
    expect(response).toBe("Deleted notes.txt.");
  });

  it("does not execute a NEEDS_APPROVAL ask if the user denies it", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("NEEDS_APPROVAL: delete the file notes.txt");
    const requestApproval = vi.fn().mockResolvedValue(false);
    const response = await executeCommand(
      { kind: "ask", text: "delete notes.txt" },
      { setTheme: vi.fn(), runOrchestrator, requestApproval }
    );
    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    expect(response).toBe("Not approved — nothing was run.");
  });

  it("describes a NEEDS_APPROVAL ask without executing when no approval flow is available", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("NEEDS_APPROVAL: delete the file notes.txt");
    const response = await executeCommand(
      { kind: "ask", text: "delete notes.txt" },
      { setTheme: vi.fn(), runOrchestrator }
    );
    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    expect(response).toContain("delete the file notes.txt");
    expect(response).toMatch(/approval/i);
  });
});

describe("runVoiceCommand / runVoiceCommandConfirmed (Milestone 41)", () => {
  it("runs a Level 1/2 command straight through, no confirmation needed", async () => {
    const result = await runVoiceCommand("status", { setTheme: vi.fn() });
    expect(result.status).toBe("done");
    expect(result.text).toMatch(/status/i);
  });

  it("flags a Level 3 Skill as needing confirmation instead of running it or opening a dialog", async () => {
    const runOrchestrator = vi.fn();
    const runOrchestratorBackground = vi.fn();
    const result = await runVoiceCommand("upgrade yourself", {
      setTheme: vi.fn(),
      runOrchestrator,
      runOrchestratorBackground,
    });
    expect(result.status).toBe("needs_confirmation");
    expect(runOrchestrator).not.toHaveBeenCalled();
    expect(runOrchestratorBackground).not.toHaveBeenCalled();
  });

  it("actually runs a Level 3 Skill once confirmed", async () => {
    const runOrchestratorBackground = vi
      .fn()
      .mockResolvedValue({ jobId: "job-1", sessionId: "sess-1" });
    const result = await runVoiceCommandConfirmed("upgrade yourself", {
      setTheme: vi.fn(),
      runOrchestratorBackground,
    });
    expect(result.status).toBe("done");
    expect(runOrchestratorBackground).toHaveBeenCalled();
  });

  it("answers a SAFE ask directly", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("SAFE: it's sunny.");
    const result = await runVoiceCommand("what's the weather", { setTheme: vi.fn(), runOrchestrator });
    expect(result.status).toBe("done");
    expect(result.text).toBe("it's sunny.");
  });

  it("flags a NEEDS_APPROVAL ask as needing confirmation without running the act step", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("NEEDS_APPROVAL: delete the file notes.txt");
    const result = await runVoiceCommand("delete notes.txt", { setTheme: vi.fn(), runOrchestrator });
    expect(result.status).toBe("needs_confirmation");
    expect(result.text).toContain("delete the file notes.txt");
    expect(runOrchestrator).toHaveBeenCalledTimes(1);
  });

  it("runs the confirmed ask's act step once the user says yes", async () => {
    const runOrchestrator = vi
      .fn()
      .mockResolvedValueOnce("NEEDS_APPROVAL: delete the file notes.txt")
      .mockResolvedValueOnce("Deleted notes.txt.");
    const result = await runVoiceCommandConfirmed("delete notes.txt", { setTheme: vi.fn(), runOrchestrator });
    expect(result.status).toBe("done");
    expect(result.text).toBe("Deleted notes.txt.");
    expect(runOrchestrator).toHaveBeenCalledTimes(2);
  });
});
