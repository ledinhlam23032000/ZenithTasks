export type PayrollBasis = "SALE_PAID" | "INCOME_LEDGER";

export type PayrollRuleSpec = {
  basis: PayrollBasis;
  rateBps: number;
  allocation: "EQUAL_ACTIVE_MEMBERS";
};

export type PayrollCalculationInput = {
  basisAmount: number;
  lines: Array<{ id: string; userId: string }>;
  ruleSpec: unknown;
};

export type PayrollCalculationResult = {
  basis: PayrollBasis;
  basisAmount: number;
  commissionTotal: number;
  rateBps: number;
  lines: Array<{ id: string; userId: string; commissionAmount: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parsePayrollRuleSpec(value: unknown): PayrollRuleSpec | null {
  if (!isRecord(value)) return null;
  const basis = value.basis;
  const allocation = value.allocation;
  const rateBps = value.rateBps;
  if ((basis !== "SALE_PAID" && basis !== "INCOME_LEDGER") || allocation !== "EQUAL_ACTIVE_MEMBERS" || typeof rateBps !== "number" || !Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) return null;
  return { basis, allocation, rateBps };
}

export function calculateCommissionPreview(input: PayrollCalculationInput): PayrollCalculationResult | null {
  const ruleSpec = parsePayrollRuleSpec(input.ruleSpec);
  if (!ruleSpec || input.lines.length === 0 || !Number.isSafeInteger(input.basisAmount) || input.basisAmount < 0) return null;
  const commissionTotal = Math.floor((input.basisAmount * ruleSpec.rateBps) / 10000);
  const sorted = [...input.lines].sort((a, b) => a.userId.localeCompare(b.userId));
  const base = Math.floor(commissionTotal / sorted.length);
  let remainder = commissionTotal % sorted.length;
  const amounts = new Map<string, number>();
  for (const line of sorted) {
    const amount = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    amounts.set(line.id, amount);
  }
  return { basis: ruleSpec.basis, basisAmount: input.basisAmount, commissionTotal, rateBps: ruleSpec.rateBps, lines: input.lines.map((line) => ({ ...line, commissionAmount: amounts.get(line.id) ?? 0 })) };
}
