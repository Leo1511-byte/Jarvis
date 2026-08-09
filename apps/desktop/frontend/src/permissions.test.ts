import { describe, expect, it } from "vitest";
import { permissionLevelFor } from "./permissions";

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
  });

  it("classifies workspace-modifying commands as level 2", () => {
    expect(permissionLevelFor("continue-project")).toBe(2);
  });

  it("classifies destructive commands as level 3", () => {
    expect(permissionLevelFor("delete-project")).toBe(3);
  });

  it("defaults unknown command kinds to the strictest level", () => {
    expect(permissionLevelFor("some-future-command-nobody-classified-yet")).toBe(3);
  });
});
