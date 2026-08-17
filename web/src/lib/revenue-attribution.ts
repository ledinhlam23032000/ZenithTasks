export const FULL_SHARE_BPS = 10_000;

export type AllocationRole = "CONSULTANT" | "DOCTOR" | "NURSE" | "OTHER";

export type ExplicitAllocation = {
  userId: string;
  role: AllocationRole;
  shareBps: number;
};

export type CaseRevenueInput = {
  caseId: string;
  totalRevenue: number;
  consultantId: string | null;
  doctorId: string | null;
  allocations?: ExplicitAllocation[];
};

export type StaffRevenueAttribution = {
  caseId: string;
  userId: string;
  role: AllocationRole | "MULTI_ROLE";
  shareBps: number;
  amount: number;
  source: "EXPLICIT" | "LEGACY_ROLE" | "LEGACY_DEDUPED";
};

export type AllocationValidation =
  | { ok: true; totalShareBps: number }
  | { ok: false; error: string; totalShareBps: number };

export function validateAllocations(allocations: ExplicitAllocation[], requireFull = true): AllocationValidation {
  if (allocations.length === 0) return { ok: false, error: "Cần ít nhất một người được phân bổ.", totalShareBps: 0 };
  const seen = new Set<string>();
  let totalShareBps = 0;
  for (const allocation of allocations) {
    if (!allocation.userId || !Number.isInteger(allocation.shareBps) || allocation.shareBps <= 0) {
      return { ok: false, error: "Tỷ lệ phân bổ phải là số nguyên dương theo điểm cơ bản.", totalShareBps };
    }
    if (allocation.shareBps > FULL_SHARE_BPS) {
      return { ok: false, error: "Một người không được nhận quá 100% doanh thu.", totalShareBps };
    }
    const key = `${allocation.userId}:${allocation.role}`;
    if (seen.has(key)) return { ok: false, error: "Không được lặp cùng nhân sự và vai trò trong một hồ sơ.", totalShareBps };
    seen.add(key);
    totalShareBps += allocation.shareBps;
  }
  if (totalShareBps > FULL_SHARE_BPS) return { ok: false, error: "Tổng phân bổ không được vượt quá 100%.", totalShareBps };
  if (requireFull && totalShareBps !== FULL_SHARE_BPS) return { ok: false, error: "Hồ sơ chốt phải được phân bổ đủ 100%.", totalShareBps };
  return { ok: true, totalShareBps };
}

function roundedAllocations(caseId: string, totalRevenue: number, allocations: ExplicitAllocation[], source: StaffRevenueAttribution["source"]): StaffRevenueAttribution[] {
  const total = Math.max(0, Math.round(totalRevenue));
  let assigned = 0;
  return allocations.map((allocation, index) => {
    const amount = index === allocations.length - 1
      ? Math.max(0, total - assigned)
      : Math.floor((total * allocation.shareBps) / FULL_SHARE_BPS);
    assigned += amount;
    return { caseId, userId: allocation.userId, role: allocation.role, shareBps: allocation.shareBps, amount, source };
  });
}

/**
 * Attribution rules:
 * - Explicit allocations are the source of truth for coordinated consulting.
 * - Legacy same-user consultant+doctor cases are credited once, not twice.
 * - Legacy different-user cases preserve the existing role credit until an explicit split is entered.
 */
export function attributeCaseRevenue(input: CaseRevenueInput): StaffRevenueAttribution[] {
  const totalRevenue = Math.max(0, Math.round(input.totalRevenue));
  if (input.allocations?.length) return roundedAllocations(input.caseId, totalRevenue, input.allocations, "EXPLICIT");

  if (input.consultantId && input.consultantId === input.doctorId) {
    return [{ caseId: input.caseId, userId: input.consultantId, role: "MULTI_ROLE", shareBps: FULL_SHARE_BPS, amount: totalRevenue, source: "LEGACY_DEDUPED" }];
  }

  const legacy: ExplicitAllocation[] = [];
  if (input.consultantId) legacy.push({ userId: input.consultantId, role: "CONSULTANT", shareBps: FULL_SHARE_BPS });
  if (input.doctorId) legacy.push({ userId: input.doctorId, role: "DOCTOR", shareBps: FULL_SHARE_BPS });
  return legacy.map((allocation) => ({ caseId: input.caseId, userId: allocation.userId, role: allocation.role, shareBps: FULL_SHARE_BPS, amount: totalRevenue, source: "LEGACY_ROLE" }));
}

export type StaffRevenueSummary = {
  totalRevenue: number;
  consultantRevenue: number;
  doctorRevenue: number;
  allocatedRevenue: number;
};

export function summarizeStaffRevenue(cases: CaseRevenueInput[]): Map<string, StaffRevenueSummary> {
  const map = new Map<string, StaffRevenueSummary>();
  for (const input of cases) {
    for (const attribution of attributeCaseRevenue(input)) {
      const current = map.get(attribution.userId) ?? { totalRevenue: 0, consultantRevenue: 0, doctorRevenue: 0, allocatedRevenue: 0 };
      current.totalRevenue += attribution.amount;
      current.allocatedRevenue += attribution.amount;
      if (attribution.role === "CONSULTANT") current.consultantRevenue += attribution.amount;
      if (attribution.role === "DOCTOR") current.doctorRevenue += attribution.amount;
      if (attribution.role === "MULTI_ROLE") {
        current.consultantRevenue += attribution.amount;
        current.doctorRevenue += attribution.amount;
      }
      map.set(attribution.userId, current);
    }
  }
  return map;
}
