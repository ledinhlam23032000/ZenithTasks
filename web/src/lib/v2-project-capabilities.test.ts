import { describe, expect, it } from "vitest";
import { projectCapabilitiesForPreset, projectMemberCan } from "./v2-project-capabilities";

describe("project membership capabilities", () => {
  it("keeps viewer read-only and maps operational presets", () => {
    expect(projectMemberCan({ preset: "VIEWER" }, "workspace.view")).toBe(true);
    expect(projectMemberCan({ preset: "VIEWER" }, "customers.manage")).toBe(false);
    expect(projectMemberCan({ preset: "SALES" }, "customers.manage")).toBe(true);
    expect(projectMemberCan({ preset: "SALES" }, "finance.manage")).toBe(false);
    expect(projectMemberCan({ preset: "FINANCE" }, "finance.manage")).toBe(true);
  });

  it("keeps project admin scoped to the company capability contract", () => {
    expect(projectMemberCan({ preset: "PROJECT_ADMIN" }, "members.manage")).toBe(true);
    expect(projectMemberCan({ preset: "PROJECT_ADMIN" }, "payroll.manage")).toBe(true);
    expect(projectCapabilitiesForPreset("PROJECT_ADMIN")).toContain("config.manage");
  });

  it("requires explicit grants for custom membership", () => {
    expect(projectMemberCan({ preset: "CUSTOM", permissions: { grant: ["sales.manage"] } }, "sales.manage")).toBe(true);
    expect(projectMemberCan({ preset: "CUSTOM", permissions: { grant: ["sales.manage"], deny: ["sales.manage"] } }, "sales.manage")).toBe(false);
    expect(projectMemberCan({ preset: "CUSTOM" }, "sales.manage")).toBe(false);
  });
});
