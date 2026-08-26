import { describe, expect, it } from "vitest";
import { validateWorkspaceLayout } from "./v2-workspace-layout-policy";

describe("workspace layout policy", () => {
  const enabled = ["organization", "mechanism", "tasks", "customers"];

  it("accepts a unique order containing only enabled available modules", () => {
    const result = validateWorkspaceLayout({ order: ["customers", "tasks", "mechanism"] }, enabled);
    expect(result.ok).toBe(true);
  });

  it("rejects duplicates, unknown keys and planned payroll", () => {
    expect(validateWorkspaceLayout({ order: ["tasks", "tasks"] }, enabled).ok).toBe(false);
    expect(validateWorkspaceLayout({ order: ["unknown"] }, enabled).ok).toBe(false);
    expect(validateWorkspaceLayout({ order: ["payroll"] }, [...enabled, "payroll"]).ok).toBe(false);
  });
});
