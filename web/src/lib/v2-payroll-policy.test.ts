import { describe, expect, it } from "vitest";
import { canVoidPayrollStatus, hasTwoDistinctPayrollApprovals } from "./v2-payroll-policy";

describe("project payroll governance policy", () => {
  it("requires two distinct approval actors", () => {
    expect(hasTwoDistinctPayrollApprovals("admin-a", "admin-b")).toBe(true);
    expect(hasTwoDistinctPayrollApprovals("admin-a", "admin-a")).toBe(false);
    expect(hasTwoDistinctPayrollApprovals("admin-a", null)).toBe(false);
  });

  it("allows void only after approval/finalization", () => {
    expect(canVoidPayrollStatus("APPROVED")).toBe(true);
    expect(canVoidPayrollStatus("FINALIZED")).toBe(true);
    expect(canVoidPayrollStatus("DRAFT")).toBe(false);
    expect(canVoidPayrollStatus("VOIDED")).toBe(false);
  });
});
