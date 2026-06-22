import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import type { Role } from "@/generated/prisma/client";

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
};

export async function getStaffPerformance(monthDate: Date) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);

  const [users, consultG, consultAgreedG, doctorG, attendanceG, careG] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, role: true, avatarUrl: true }, orderBy: [{ role: "asc" }, { fullName: "asc" }] }),
    prisma.caseRecord.groupBy({ by: ["consultantId"], where: { createdAt: { gte, lte }, consultantId: { not: null } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.caseRecord.groupBy({ by: ["consultantId"], where: { createdAt: { gte, lte }, consultResult: "AGREED", consultantId: { not: null } }, _count: { _all: true } }),
    prisma.caseRecord.groupBy({ by: ["doctorId"], where: { createdAt: { gte, lte }, doctorId: { not: null } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.attendance.groupBy({ by: ["userId"], where: { date: { gte, lte } }, _count: { _all: true } }),
    prisma.careMessage.groupBy({ by: ["createdById"], where: { createdAt: { gte, lte }, createdById: { not: null } }, _count: { _all: true } }),
  ]);

  const cCount = new Map(consultG.map((g) => [g.consultantId, g._count._all]));
  const cRev = new Map(consultG.map((g) => [g.consultantId, toNum(g._sum.totalAmount)]));
  const cAgreed = new Map(consultAgreedG.map((g) => [g.consultantId, g._count._all]));
  const dCount = new Map(doctorG.map((g) => [g.doctorId, g._count._all]));
  const dRev = new Map(doctorG.map((g) => [g.doctorId, toNum(g._sum.totalAmount)]));
  const days = new Map(attendanceG.map((g) => [g.userId, g._count._all]));
  const care = new Map(careG.map((g) => [g.createdById, g._count._all]));

  const rows: StaffPerfRow[] = users.map((u) => {
    const consultCases = cCount.get(u.id) ?? 0;
    const consultAgreed = cAgreed.get(u.id) ?? 0;
    const consultRevenue = cRev.get(u.id) ?? 0;
    const doctorRevenue = dRev.get(u.id) ?? 0;
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
      totalRevenue: consultRevenue + doctorRevenue,
    };
  });

  return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getStaffDetail(userId: string, monthDate: Date) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const inc = { customer: { select: { id: true, fullName: true, code: true } } };

  const [user, consultCases, doctorCases, daysWorked, careCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, role: true, code: true, avatarUrl: true } }),
    prisma.caseRecord.findMany({ where: { consultantId: userId, createdAt: { gte, lte } }, include: inc, orderBy: { createdAt: "desc" } }),
    prisma.caseRecord.findMany({ where: { doctorId: userId, createdAt: { gte, lte } }, include: inc, orderBy: { createdAt: "desc" } }),
    prisma.attendance.count({ where: { userId, date: { gte, lte } } }),
    prisma.careMessage.count({ where: { createdById: userId, createdAt: { gte, lte } } }),
  ]);

  return { user, consultCases, doctorCases, daysWorked, careCount };
}

// ============================================================================
// CỘNG TÁC VIÊN — gộp theo tên (Customer.sourceDetail) với nguồn = COLLABORATOR.
// ============================================================================

export type CollaboratorRow = {
  name: string;
  registered: boolean;
  customers: number;
  cases: number;
  revenue: number;
  commission: number;
};

export async function getCollaborators(gte: Date, lte: Date): Promise<CollaboratorRow[]> {
  const [cases, profiles] = await Promise.all([
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte }, customer: { source: "COLLABORATOR" } },
      select: { totalAmount: true, commissionAmount: true, customerId: true, customer: { select: { sourceDetail: true } } },
    }),
    prisma.collaborator.findMany({ where: { active: true }, select: { name: true } }),
  ]);
  const map = new Map<string, { customers: Set<string>; cases: number; revenue: number; commission: number }>();
  for (const c of cases) {
    const name = c.customer?.sourceDetail?.trim() || "CTV chưa ghi tên";
    const e = map.get(name) ?? { customers: new Set<string>(), cases: 0, revenue: 0, commission: 0 };
    e.customers.add(c.customerId);
    e.cases += 1;
    e.revenue += toNum(c.totalAmount);
    e.commission += toNum(c.commissionAmount);
    map.set(name, e);
  }
  const registered = new Set(profiles.map((p) => p.name));
  // Gộp cả CTV đã đăng ký (kể cả chưa có ca trong kỳ) lẫn tên xuất hiện trong hồ sơ.
  const names = new Set<string>([...map.keys(), ...registered]);
  return [...names]
    .map((name) => {
      const e = map.get(name);
      return {
        name,
        registered: registered.has(name),
        customers: e ? e.customers.size : 0,
        cases: e?.cases ?? 0,
        revenue: e?.revenue ?? 0,
        commission: e?.commission ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.cases - a.cases);
}

export async function getCollaboratorDetail(name: string, gte: Date, lte: Date) {
  const [profile, cases] = await Promise.all([
    prisma.collaborator.findUnique({ where: { name } }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte }, customer: { source: "COLLABORATOR", sourceDetail: name } },
      include: { customer: { select: { id: true, fullName: true, code: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const customers = new Set(cases.map((c) => c.customerId));
  const revenue = cases.reduce((s, c) => s + toNum(c.totalAmount), 0);
  const commission = cases.reduce((s, c) => s + toNum(c.commissionAmount), 0);
  return { name, profile, cases, customers: customers.size, revenue, commission };
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
