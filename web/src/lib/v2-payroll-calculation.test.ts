import { describe, expect, it } from "vitest";
import { calculateCommissionPreview, parsePayrollRuleSpec } from "./v2-payroll-calculation";

describe("project payroll calculation", () => {
  it("accepts only the explicit supported rule contract", () => {
    expect(parsePayrollRuleSpec({ basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" })).toEqual({ basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" });
    expect(parsePayrollRuleSpec({ basis: "SALE_PAID", rateBps: 10, allocation: "CUSTOM_AI" })).toBeNull();
    expect(parsePayrollRuleSpec({ basis: "SALE_PAID", rateBps: 10001, allocation: "EQUAL_ACTIVE_MEMBERS" })).toBeNull();
  });

  it("splits commission deterministically and preserves the total", () => {
    const result = calculateCommissionPreview({ basisAmount: 1000000, ruleSpec: { basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" }, lines: [{ id: "b", userId: "user-b" }, { id: "a", userId: "user-a" }, { id: "c", userId: "user-c" }] });
    expect(result?.commissionTotal).toBe(100000);
    expect(result?.lines.map((line) => line.commissionAmount)).toEqual([33333, 33334, 33333]);
    expect(result?.lines.reduce((sum, line) => sum + line.commissionAmount, 0)).toBe(100000);
  });

  it("never calculates a negative or unsafe basis", () => {
    expect(calculateCommissionPreview({ basisAmount: -1, ruleSpec: { basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" }, lines: [{ id: "a", userId: "user-a" }] })).toBeNull();
    expect(calculateCommissionPreview({ basisAmount: Number.MAX_SAFE_INTEGER + 1, ruleSpec: { basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" }, lines: [{ id: "a", userId: "user-a" }] })).toBeNull();
  });
});
