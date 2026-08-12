import { describe, expect, it } from "vitest";
import { permissionLevelFor } from "./permissions";
import { BUILTIN_SKILLS } from "./lib/store/builtinSkills";

describe("permissionLevelFor", () => {
  it("classifies safe commands as level 1", () => {
    expect(permissionLevelFor("switch-theme")).toBe(1);
    expect(permissionLevelFor("system-status")).toBe(1);
    expect(permissionLevelFor("help")).toBe(1);
  });

  it("classifies read-only orchestrator commands as level 1", () => {
    expect(permissionLevelFor("research")).toBe(1);
    expect(permissionLevelFor("check-calendar")).toBe(1);
    expect(permissionLevelFor("check-email")).toBe(1);
    expect(permissionLevelFor("check-github")).toBe(1);
    expect(permissionLevelFor("check-memory")).toBe(1);
    expect(permissionLevelFor("ask")).toBe(1);
  });

  it("classifies workspace-modifying commands as level 2", () => {
    expect(permissionLevelFor("continue-project")).toBe(2);
  });

  it("classifies destructive commands as level 3", () => {
    expect(permissionLevelFor("delete-project")).toBe(3);
    expect(permissionLevelFor("self-upgrade")).toBe(3);
  });

  it("defaults unknown command kinds to the strictest level", () => {
    expect(permissionLevelFor("some-future-command-nobody-classified-yet")).toBe(3);
  });

  it("keeps builtinSkills.ts's permission levels in sync with this file (Milestone 24)", () => {
    // Regression guard: the Skills registry (builtinSkills.ts) declares its
    // own permissionLevel per skill rather than importing permissionLevelFor
    // directly (it needs to work in both LocalStore and the Supabase seed
    // migration's plain SQL), so nothing enforces these stay identical
    // except this test. If they ever drift, the Skills UI (M25) would show
    // a different level than commandEngine.ts actually enforces.
    for (const skill of BUILTIN_SKILLS) {
      expect(permissionLevelFor(skill.id)).toBe(skill.permissionLevel);
    }
  });
});
