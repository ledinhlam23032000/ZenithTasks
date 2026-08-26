import { describe, expect, it } from "vitest";
import { parseMechanismTestCases, runMechanismRuleTests } from "./v2-mechanism-test";

describe("project mechanism rule tests", () => {
  it("parses only bounded non-negative integer cases", () => {
    expect(parseMechanismTestCases([{ name: "10%", basisAmount: 100000, expectedCommission: 10000 }, { name: "bad", basisAmount: -1, expectedCommission: 1 }, { name: "bad", basisAmount: 1.5, expectedCommission: 1 }])).toEqual([{ name: "10%", basisAmount: 100000, expectedCommission: 10000 }]);
  });

  it("returns auditable pass/fail results", () => {
    expect(runMechanismRuleTests({ basis: "SALE_PAID", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" }, [{ name: "happy", basisAmount: 100000, expectedCommission: 10000 }, { name: "wrong expected", basisAmount: 100000, expectedCommission: 9999 }])).toEqual([{ name: "happy", actualCommission: 10000, expectedCommission: 10000, passed: true }, { name: "wrong expected", actualCommission: 10000, expectedCommission: 9999, passed: false }]);
  });

  it("fails closed for unsupported rules", () => {
    expect(runMechanismRuleTests({ rate: 0.1, basis: "net_revenue" }, [{ name: "unsupported", basisAmount: 100000, expectedCommission: 10000 }])).toEqual([{ name: "unsupported", actualCommission: null, expectedCommission: 10000, passed: false }]);
  });
});
