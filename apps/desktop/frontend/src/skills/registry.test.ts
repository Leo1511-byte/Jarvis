import { describe, expect, it, vi } from "vitest";
import { SKILLS, getSkill } from "./registry";

describe("skills registry", () => {
  it("has all six built-in skills with a software domain", () => {
    expect(SKILLS.map((s) => s.id)).toEqual([
      "research",
      "continue-project",
      "check-calendar",
      "check-email",
      "check-github",
      "check-memory",
    ]);
    expect(SKILLS.every((s) => s.domain === "software")).toBe(true);
  });

  it("getSkill looks up by id and returns undefined for unknown ids", () => {
    expect(getSkill("check-github")?.name).toBe("Check GitHub");
    expect(getSkill("start-print-job")).toBeUndefined();
  });

  it("check-calendar's execute sends a read-only prompt through the orchestrator", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Two meetings today.");
    const skill = getSkill("check-calendar")!;
    const response = await skill.execute({ runOrchestrator });
    expect(response).toBe("Two meetings today.");
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Read-only"));
  });

  it("research's execute mentions the active project when one is set", async () => {
    const runOrchestrator = vi.fn().mockResolvedValue("Found 3 papers.");
    const skill = getSkill("research")!;
    await skill.execute({ runOrchestrator, activeProject: { name: "Ape War Game" } }, "quantum computing");
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("Ape War Game"));
    expect(runOrchestrator).toHaveBeenCalledWith(expect.stringContaining("quantum computing"));
  });
});
