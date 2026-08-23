export type V2Rule =
  | { id: string; type: "percentage"; base: string; rate: number; output: string }
  | { id: string; type: "fixed"; amount: number; output: string }
  | { id: string; type: "threshold"; base: string; threshold: number; whenMet: number; whenNotMet: number; output: string }
  | { id: string; type: "tiered"; base: string; mode: "flat" | "progressive"; tiers: Array<{ upTo: number | null; rate: number }>; output: string }
  | { id: string; type: "split"; base: string; shares: Array<{ key: string; percent: number }>; output: string };

export type V2RuleSpec = { roundingUnit?: number; rules: V2Rule[] };
export type V2Simulation = { ok: boolean; outputs: Record<string, number>; trace: string[]; errors: string[] };

const numberValue = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round = (value: number, unit = 1) => unit > 0 ? Math.round(value / unit) * unit : value;

function tiered(base: number, rule: Extract<V2Rule, { type: "tiered" }>): number {
  if (rule.mode === "flat") {
    const tier = rule.tiers.find((item) => item.upTo === null || base <= item.upTo) ?? rule.tiers.at(-1)!;
    return base * tier.rate / 100;
  }
  let previous = 0;
  let total = 0;
  for (const tier of rule.tiers) {
    const upper = tier.upTo ?? base;
    const slice = Math.max(0, Math.min(base, upper) - previous);
    total += slice * tier.rate / 100;
    previous = upper;
    if (upper >= base) break;
  }
  return total;
}

export function simulateV2RuleSpec(spec: V2RuleSpec, inputs: Record<string, number>): V2Simulation {
  const errors: string[] = [];
  const outputs: Record<string, number> = {};
  const trace: string[] = [];
  if (!spec.rules.length) return { ok: false, outputs, trace, errors: ["Cơ chế cần ít nhất một rule."] };
  for (const rule of spec.rules) {
    if (!rule.id || !rule.output) errors.push("Rule thiếu id hoặc output.");
    if (rule.type === "percentage" && (!numberValue(rule.rate) || rule.rate < 0 || rule.rate > 100)) errors.push(`${rule.id}: tỷ lệ phải từ 0 đến 100.`);
    if (rule.type === "split" && Math.abs(rule.shares.reduce((sum, item) => sum + item.percent, 0) - 100) > 0.001) errors.push(`${rule.id}: tổng chia phải bằng 100%.`);
  }
  if (errors.length) return { ok: false, outputs, trace, errors };
  for (const rule of spec.rules) {
    if (rule.type === "fixed") { outputs[rule.output] = round(rule.amount, spec.roundingUnit); trace.push(`${rule.id}: fixed = ${outputs[rule.output]}`); continue; }
    const base = "base" in rule ? inputs[rule.base] ?? outputs[rule.base] : undefined;
    if (base === undefined) { errors.push(`${rule.id}: thiếu input ${"base" in rule ? rule.base : ""}.`); continue; }
    if (rule.type === "percentage") outputs[rule.output] = round(base! * rule.rate / 100, spec.roundingUnit);
    if (rule.type === "threshold") outputs[rule.output] = round(base! >= rule.threshold ? rule.whenMet : rule.whenNotMet, spec.roundingUnit);
    if (rule.type === "tiered") outputs[rule.output] = round(tiered(base!, rule), spec.roundingUnit);
    if (rule.type === "split") for (const share of rule.shares) outputs[`${rule.output}.${share.key}`] = round(base! * share.percent / 100, spec.roundingUnit);
    trace.push(`${rule.id}: ${JSON.stringify(outputs)}`);
  }
  return { ok: errors.length === 0, outputs, trace, errors };
}
