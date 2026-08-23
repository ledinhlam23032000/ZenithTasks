import { describe, expect, it } from "vitest";
import { simulateV2RuleSpec } from "./v2-rule-engine";

describe("V2 rule engine", () => {
  it("calculates a Cellarisca-like percentage", () => {
    const result = simulateV2RuleSpec({ rules: [{ id: "agent", type: "percentage", base: "gross_sales", rate: 30, output: "company_revenue" }] }, { gross_sales: 7_972_000 });
    expect(result.ok).toBe(true);
    expect(result.outputs.company_revenue).toBe(2_391_600);
  });
  it("supports flat and progressive tiers", () => {
    const flat = simulateV2RuleSpec({ rules: [{ id: "tier", type: "tiered", base: "sales", mode: "flat", tiers: [{ upTo: 100_000_000, rate: 30 }, { upTo: null, rate: 40 }], output: "commission" }] }, { sales: 150_000_000 });
    const progressive = simulateV2RuleSpec({ rules: [{ id: "tier", type: "tiered", base: "sales", mode: "progressive", tiers: [{ upTo: 100_000_000, rate: 30 }, { upTo: null, rate: 40 }], output: "commission" }] }, { sales: 150_000_000 });
    expect(flat.outputs.commission).toBe(60_000_000);
    expect(progressive.outputs.commission).toBe(50_000_000);
  });
  it("supports threshold, split and rounding", () => {
    const result = simulateV2RuleSpec({ roundingUnit: 1_000, rules: [{ id: "bonus", type: "threshold", base: "sales", threshold: 100_000_000, whenMet: 5_000_000, whenNotMet: 0, output: "bonus" }, { id: "split", type: "split", base: "cash", shares: [{ key: "sales", percent: 70 }, { key: "partner", percent: 30 }], output: "share" }] }, { sales: 120_000_000, cash: 10_000_000 });
    expect(result.outputs.bonus).toBe(5_000_000);
    expect(result.outputs["share.sales"]).toBe(7_000_000);
    expect(result.outputs["share.partner"]).toBe(3_000_000);
  });
  it("rejects a split that does not total 100 percent", () => {
    const result = simulateV2RuleSpec({ rules: [{ id: "split", type: "split", base: "cash", shares: [{ key: "sales", percent: 80 }], output: "share" }] }, { cash: 10 });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("100%");
  });
});
