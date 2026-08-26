import { V2_MODULES, type V2ModuleKey } from "./v2-modules";

export type WorkspaceLayout = { order: V2ModuleKey[]; groups?: Record<string, V2ModuleKey[]> };
const known = new Set(V2_MODULES.map((module) => module.key));
const available = new Set(V2_MODULES.filter((module) => module.available).map((module) => module.key));

export function validateWorkspaceLayout(raw: unknown, enabledKeys: readonly string[]): { ok: true; layout: WorkspaceLayout } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Layout phải là JSON object." };
  const orderRaw = (raw as { order?: unknown }).order;
  if (!Array.isArray(orderRaw) || orderRaw.length === 0) return { ok: false, error: "Layout phải có order không rỗng." };
  const order = orderRaw.map(String) as V2ModuleKey[];
  if (new Set(order).size !== order.length) return { ok: false, error: "Layout không được lặp module." };
  if (order.some((key) => !known.has(key))) return { ok: false, error: "Layout chứa module không tồn tại." };
  if (order.some((key) => !available.has(key) || !enabledKeys.includes(key))) return { ok: false, error: "Layout chỉ được xếp module đã triển khai và đang bật." };
  return { ok: true, layout: { order } };
}
