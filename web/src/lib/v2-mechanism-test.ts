import { calculateCommissionPreview, parsePayrollRuleSpec } from "./v2-payroll-calculation";

export type MechanismRuleTestCase = { name: string; basisAmount: number; expectedCommission: number };
export type MechanismRuleTestResult = { name: string; actualCommission: number | null; expectedCommission: number; passed: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseMechanismTestCases(value: unknown): MechanismRuleTestCase[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== "string") return [];
    const basisAmount = item.basisAmount;
    const expectedCommission = item.expectedCommission;
    if (typeof basisAmount !== "number" || typeof expectedCommission !== "number" || !Number.isSafeInteger(basisAmount) || basisAmount < 0 || !Number.isSafeInteger(expectedCommission) || expectedCommission < 0) return [];
    return [{ name: item.name.slice(0, 120), basisAmount: basisAmount as number, expectedCommission: expectedCommission as number }];
  }).slice(0, 50);
}

export function runMechanismRuleTests(ruleSpec: unknown, cases: unknown): MechanismRuleTestResult[] {
  const parsedRule = parsePayrollRuleSpec(ruleSpec);
  return parseMechanismTestCases(cases).map((testCase) => {
    const calculation = parsedRule ? calculateCommissionPreview({ basisAmount: testCase.basisAmount, ruleSpec: parsedRule, lines: [{ id: "test-line", userId: "test-user" }] }) : null;
    const actualCommission = calculation?.commissionTotal ?? null;
    return { name: testCase.name, actualCommission, expectedCommission: testCase.expectedCommission, passed: actualCommission === testCase.expectedCommission };
  });
}
