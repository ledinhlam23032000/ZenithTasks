import { startOfMonth, endOfMonth, subMonths, subYears, startOfYear, startOfWeek, addDays, getDate, format } from "date-fns";
import { vi } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { summarizeCase } from "@/lib/financial-summary";
import { vnDateOnly } from "@/lib/dates";
import { collectionsByStaff, type StaffCollection } from "@/lib/collections";
import { debtByStaff } from "@/lib/payroll-pure";
import { summarizeStaffRevenue, type CaseRevenueInput } from "@/lib/revenue-attribution";
import type { Role } from "@/generated/prisma/client";

const EMPTY_COLLECTION: StaffCollection = { total: 0, fromNew: 0, fromDebt: 0 };

export type TrendPoint = { label: string; value: number };
export type RangeSeries = { thisWeek: TrendPoint[]; weeksOfMonth: TrendPoint[]; m12: TrendPoint[]; y5: TrendPoint[] };

// ============================================================================
// HIỆU SUẤT NHÂN SỰ — gộp số liệu tư vấn, mổ (bác sĩ), ngày công, chăm sóc.
// ============================================================================

export type StaffPerfRow = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  daysWorked: number; // chấm công (mức độ chăm chỉ)
  careCount: number; // số tin chăm sóc khách (chăm chỉ)
  consultCases: number;
  consultAgreed: number;
  consultRate: number;
  consultRevenue: number;
  doctorCases: number;
  doctorRevenue: number;
  totalRevenue: number; // doanh số phụ trách (tư vấn + mổ, có thể trùng nếu kiêm)
  collectedConsult: StaffCollection; // thực thu trong tháng theo vai trò tư vấn (gồm thu nợ ca cũ)
  collectedDoctor: StaffCollection; // thực thu trong tháng theo vai trò bác sĩ
  debtOutstanding: number; // khách của mình (tư vấn/bác sĩ) còn nợ cộng dồn tới hiện tại — đồng bộ với lib/payroll.ts
};

export async function getStaffPerformance(monthDate: Date) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  // Attendance.date là cột @db.Date — mốc riêng bằng vnDateOnly(), KHÔNG dùng chung
  // gte/lte (giờ LOCAL) ở trên, tránh ngày cuối tháng trước lẫn vào tháng sau khi so
  // với cột DATE (xem giải thích đầy đủ ở cham-cong/page.tsx).
  const attGte = vnDateOnly(gte);
  const attLte = vnDateOnly(lte);

  const [users, consultG, consultAgreedG, doctorG, attendanceG, careG, monthPayments, revenueCases, debtCases] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, role: true, avatarUrl: true }, orderBy: [{ role: "asc" }, { fullName: "asc" }] }),
    prisma.caseRecord.groupBy({ by: ["consultantId"], where: { createdAt: { gte, lte }, consultantId: { not: null } }, _count: { _all: true } }),
    prisma.caseRecord.groupBy({ by: ["consultantId"], where: { createdAt: { gte, lte }, consultResult: "AGREED", consultantId: { not: null } }, _count: { _all: true } }),
    prisma.caseRecord.groupBy({ by: ["doctorId"], where: { createdAt: { gte, lte }, doctorId: { not: null } }, _count: { _all: true } }),
    prisma.attendance.groupBy({ by: ["userId"], where: { date: { gte: attGte, lte: attLte } }, _count: { _all: true } }),
    prisma.careMessage.groupBy({ by: ["createdById"], where: { createdAt: { gte, lte }, createdById: { not: null } }, _count: { _all: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte, lte } },
      select: { amount: true, paidAt: true, case: { select: { createdAt: true, consultantId: true, doctorId: true } } },
    }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte } },
      select: {
        id: true,
        consultantId: true,
        doctorId: true,
        voucherAmount: true,
        services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
        payments: { select: { amount: true } },
        revenueAllocations: { select: { userId: true, role: true, shareBps: true } },
      },
    }),
    prisma.caseRecord.findMany({
      where: {},
      select: {
        consultantId: true,
        doctorId: true,
        voucherAmount: true,
        services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
        payments: { select: { amount: true } },
      },
    }),
  ]);

  const cCount = new Map(consultG.map((g) => [g.consultantId, g._count._all]));
  const attributed = summarizeStaffRevenue(revenueCases.map((c): CaseRevenueInput => ({
    caseId: c.id,
    totalRevenue: summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount }).total,
    consultantId: c.consultantId,
    doctorId: c.doctorId,
    allocations: c.revenueAllocations.map((a) => ({ userId: a.userId, role: a.role, shareBps: a.shareBps })),
  })));
  const cAgreed = new Map(consultAgreedG.map((g) => [g.consultantId, g._count._all]));
  const dCount = new Map(doctorG.map((g) => [g.doctorId, g._count._all]));
  const days = new Map(attendanceG.map((g) => [g.userId, g._count._all]));
  const care = new Map(careG.map((g) => [g.createdById, g._count._all]));
  const debtByStaffMap = debtByStaff(
    debtCases.map((c) => ({
      consultantId: c.consultantId,
      doctorId: c.doctorId,
      debt: summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount }).debt,
    })),
  );
  const collected = collectionsByStaff(
    monthPayments.map((p) => ({
      amount: toNum(p.amount),
      paidAt: p.paidAt,
      caseCreatedAt: p.case.createdAt,
      consultantId: p.case.consultantId,
      doctorId: p.case.doctorId,
    })),
    gte,
  );

  const rows: StaffPerfRow[] = users.map((u) => {
    const consultCases = cCount.get(u.id) ?? 0;
    const consultAgreed = cAgreed.get(u.id) ?? 0;
    const revenue = attributed.get(u.id);
    const consultRevenue = revenue?.consultantRevenue ?? 0;
    const doctorRevenue = revenue?.doctorRevenue ?? 0;
    return {
      id: u.id,
      name: u.fullName,
      role: u.role,
      avatarUrl: u.avatarUrl,
      daysWorked: days.get(u.id) ?? 0,
      careCount: care.get(u.id) ?? 0,
      consultCases,
      consultAgreed,
      consultRate: consultCases > 0 ? Math.round((consultAgreed / consultCases) * 100) : 0,
      consultRevenue,
      doctorCases: dCount.get(u.id) ?? 0,
      doctorRevenue,
      totalRevenue: revenue?.totalRevenue ?? 0,
      collectedConsult: collected.consultants.get(u.id) ?? EMPTY_COLLECTION,
      collectedDoctor: collected.doctors.get(u.id) ?? EMPTY_COLLECTION,
      debtOutstanding: debtByStaffMap.get(u.id) ?? 0,
    };
  });

  return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getStaffDetail(userId: string, monthDate: Date) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  // Attendance.date là cột @db.Date — mốc riêng, xem giải thích ở getStaffPerformance().
  const attGte = vnDateOnly(gte);
  const attLte = vnDateOnly(lte);
  const inc = {
    customer: { select: { id: true, fullName: true, code: true } },
    services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
    revenueAllocations: { select: { userId: true, role: true, shareBps: true } },
  };

  const [user, consultCases, doctorCases, daysWorked, careCount, collectedPayments] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, role: true, code: true, avatarUrl: true } }),
    prisma.caseRecord.findMany({ where: { consultantId: userId, createdAt: { gte, lte } }, include: inc, orderBy: { createdAt: "desc" } }),
    prisma.caseRecord.findMany({ where: { doctorId: userId, createdAt: { gte, lte } }, include: inc, orderBy: { createdAt: "desc" } }),
    prisma.attendance.count({ where: { userId, date: { gte: attGte, lte: attLte } } }),
    prisma.careMessage.count({ where: { createdById: userId, createdAt: { gte, lte } } }),
    // Từng khoản tiền thật đã về trong tháng từ hồ sơ mình phụ trách (tư vấn hoặc mổ)
    prisma.payment.findMany({
      where: { paidAt: { gte, lte }, case: { OR: [{ consultantId: userId }, { doctorId: userId }] } },
      select: {
        id: true, amount: true, paidAt: true, method: true,
        case: {
          select: {
            id: true, code: true, createdAt: true, consultantId: true, doctorId: true,
            customer: { select: { id: true, fullName: true, code: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const collections = collectedPayments.map((p) => ({
    id: p.id,
    amount: toNum(p.amount),
    paidAt: p.paidAt,
    method: p.method,
    caseId: p.case.id,
    caseCode: p.case.code,
    customer: p.case.customer,
    isDebtCollection: p.case.createdAt < gte, // ca tạo trước tháng này → khoản này là thu nợ cũ
    asConsultant: p.case.consultantId === userId,
    asDoctor: p.case.doctorId === userId,
  }));
  const collectedTotal = collections.reduce((s, c) => s + c.amount, 0);
  const collectedFromDebt = collections.filter((c) => c.isDebtCollection).reduce((s, c) => s + c.amount, 0);
  const withCurrentTotals = (cases: typeof consultCases) =>
    cases.map((c) => ({
      ...c,
      totalAmount: summarizeCase({ services: c.services, payments: [], voucherAmount: c.voucherAmount }).total,
    }));

  const consultCasesWithTotals = withCurrentTotals(consultCases);
  const doctorCasesWithTotals = withCurrentTotals(doctorCases);
  const uniqueCases = [...new Map([...consultCasesWithTotals, ...doctorCasesWithTotals].map((c) => [c.id, c])).values()];
  const attributed = summarizeStaffRevenue(uniqueCases.map((c): CaseRevenueInput => ({
    caseId: c.id,
    totalRevenue: toNum(c.totalAmount),
    consultantId: c.consultantId,
    doctorId: c.doctorId,
    allocations: c.revenueAllocations.map((a) => ({ userId: a.userId, role: a.role, shareBps: a.shareBps })),
  }))).get(userId);

  return {
    user,
    consultCases: consultCasesWithTotals,
    doctorCases: doctorCasesWithTotals,
    attributedRevenue: attributed?.totalRevenue ?? 0,
    attributedConsultantRevenue: attributed?.consultantRevenue ?? 0,
    attributedDoctorRevenue: attributed?.doctorRevenue ?? 0,
    daysWorked,
    careCount,
    collections,
    collectedTotal,
    collectedFromDebt,
  };
}

// ============================================================================
// CỘNG TÁC VIÊN — gộp theo tên (Customer.sourceDetail) với nguồn = COLLABORATOR.
// ============================================================================

export type CollaboratorRow = {
  id: string | null;
  userId: string | null;
  name: string;
  registered: boolean;
  active: boolean;
  archivedAt: Date | null;
  suspendedAt: Date | null;
  customers: number;
  cases: number;
  revenue: number;
  commission: number;
};

export async function getCollaborators(gte: Date, lte: Date): Promise<CollaboratorRow[]> {
  const [cases, profiles] = await Promise.all([
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte }, customer: { source: "COLLABORATOR" } },
      select: {
        collaboratorId: true,
        commissionAmount: true,
        customerId: true,
        customer: { select: { sourceDetail: true, collaboratorId: true } },
        voucherAmount: true,
        services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
      },
    }),
    prisma.collaborator.findMany({ where: {}, select: { id: true, userId: true, name: true, active: true, archivedAt: true, suspendedAt: true } }),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const profileByName = new Map(profiles.map((p) => [p.name.trim(), p]));
  const map = new Map<string, { id: string | null; userId: string | null; name: string; active: boolean; archivedAt: Date | null; suspendedAt: Date | null; customers: Set<string>; cases: number; revenue: number; commission: number }>();
  for (const c of cases) {
    const collaboratorId = c.collaboratorId ?? c.customer?.collaboratorId ?? null;
    const legacyName = c.customer?.sourceDetail?.trim() || "CTV chưa ghi tên";
    const profile = collaboratorId ? profileById.get(collaboratorId) : profileByName.get(legacyName);
    const key = collaboratorId ?? `legacy:${legacyName}`;
    const e = map.get(key) ?? { id: profile?.id ?? collaboratorId, userId: profile?.userId ?? null, name: profile?.name ?? legacyName, active: profile?.active ?? true, archivedAt: profile?.archivedAt ?? null, suspendedAt: profile?.suspendedAt ?? null, customers: new Set<string>(), cases: 0, revenue: 0, commission: 0 };
    e.customers.add(c.customerId);
    e.cases += 1;
    e.revenue += summarizeCase({ services: c.services, payments: [], voucherAmount: c.voucherAmount }).total;
    e.commission += toNum(c.commissionAmount);
    map.set(key, e);
  }
  for (const profile of profiles) {
    const key = profile.id;
    if (!map.has(key)) map.set(key, { id: profile.id, userId: profile.userId, name: profile.name, active: profile.active, archivedAt: profile.archivedAt, suspendedAt: profile.suspendedAt, customers: new Set<string>(), cases: 0, revenue: 0, commission: 0 });
  }
  return [...map.values()]
    .map((e) => ({
      id: e.id,
      userId: e.userId,
      name: e.name,
      registered: Boolean(e.id && profileById.has(e.id)),
      active: e.active,
      archivedAt: e.archivedAt,
      suspendedAt: e.suspendedAt,
      customers: e.customers.size,
      cases: e.cases,
      revenue: e.revenue,
      commission: e.commission,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.cases - a.cases);
}

export async function getCollaboratorDetail(identifier: string, gte: Date, lte: Date) {
  const profile = await prisma.collaborator.findFirst({ where: { OR: [{ id: identifier }, { name: identifier }] } });
  const cases = await prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte }, customer: profile ? { source: "COLLABORATOR", collaboratorId: profile.id } : { source: "COLLABORATOR", sourceDetail: identifier } },
      include: {
        customer: { select: { id: true, fullName: true, code: true } },
        services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  const name = profile?.name ?? identifier;
  const customers = new Set(cases.map((c) => c.customerId));
  const currentCases = cases.map((c) => ({
    ...c,
    totalAmount: summarizeCase({ services: c.services, payments: [], voucherAmount: c.voucherAmount }).total,
  }));
  const revenue = currentCases.reduce((s, c) => s + toNum(c.totalAmount), 0);
  const commission = cases.reduce((s, c) => s + toNum(c.commissionAmount), 0);
  return { name, profile, cases: currentCases, customers: customers.size, revenue, commission };
}

/**
 * Doanh số CTV theo nhiều mốc (tuần này / các tuần trong tháng / 12 tháng / 5 năm)
 * để xem tăng trưởng. Bỏ trống `name` = gộp TẤT CẢ cộng tác viên.
 */
export async function getCollaboratorSeries(identifier?: string): Promise<RangeSeries> {
  const now = new Date();
  const since = startOfYear(subYears(now, 4));
  const profile = identifier ? await prisma.collaborator.findFirst({ where: { OR: [{ id: identifier }, { name: identifier }] }, select: { id: true } }) : null;
  const cases = await prisma.caseRecord.findMany({
    where: {
      createdAt: { gte: since },
      customer: profile ? { source: "COLLABORATOR", collaboratorId: profile.id } : identifier ? { source: "COLLABORATOR", sourceDetail: identifier } : { source: "COLLABORATOR" },
    },
    select: {
      id: true,
      createdAt: true,
      voucherAmount: true,
      services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
    },
  });

  const build = (keys: { key: string; label: string }[], keyOf: (d: Date) => string): TrendPoint[] => {
    const m = new Map(keys.map((k) => [k.key, 0]));
    for (const c of cases) {
      const k = keyOf(c.createdAt);
      if (m.has(k)) m.set(k, (m.get(k) ?? 0) + summarizeCase({ services: c.services, payments: [], voucherAmount: c.voucherAmount }).total);
    }
    return keys.map((k) => ({ label: k.label, value: m.get(k.key) ?? 0 }));
  };

  const ws = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEEEEE dd/MM", { locale: vi }) };
  });
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MM/yy") };
  });
  const years = Array.from({ length: 5 }, (_, i) => {
    const d = subYears(now, 4 - i);
    return { key: format(d, "yyyy"), label: format(d, "yyyy") };
  });

  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const weekCount = Math.ceil(getDate(mEnd) / 7);
  const weeksOfMonth: TrendPoint[] = Array.from({ length: weekCount }, (_, i) => ({ label: `Tuần ${i + 1}`, value: 0 }));
  for (const c of cases) {
    if (c.createdAt >= mStart && c.createdAt <= mEnd) {
      const wi = Math.floor((getDate(c.createdAt) - 1) / 7);
      if (weeksOfMonth[wi]) weeksOfMonth[wi].value += summarizeCase({ services: c.services, payments: [], voucherAmount: c.voucherAmount }).total;
    }
  }

  return {
    thisWeek: build(weekDays, (d) => format(d, "yyyy-MM-dd")),
    weeksOfMonth,
    m12: build(months, (d) => format(d, "yyyy-MM")),
    y5: build(years, (d) => format(d, "yyyy")),
  };
}

/** Khoảng thời gian theo khóa range cho trang Cộng tác viên. */
export function rangeBounds(range: string, now = new Date()): { gte: Date; lte: Date; label: string } {
  if (range === "7d") {
    const gte = new Date(now);
    gte.setDate(gte.getDate() - 6);
    gte.setHours(0, 0, 0, 0);
    return { gte, lte: now, label: "7 ngày" };
  }
  if (range === "year") {
    return { gte: new Date(now.getFullYear(), 0, 1), lte: now, label: `Năm ${now.getFullYear()}` };
  }
  if (range === "all") {
    return { gte: new Date(2000, 0, 1), lte: new Date(now.getFullYear() + 1, 0, 1), label: "Tất cả" };
  }
  return { gte: startOfMonth(now), lte: endOfMonth(now), label: "Tháng này" };
}
