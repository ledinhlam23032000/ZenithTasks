import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import type { Role } from "@/generated/prisma/client";

export const STANDARD_DAYS_DEFAULT = 26;

/** Lương cứng mặc định theo vai trò (khi chưa đặt riêng cho nhân sự). */
function roleBaseDefault(role: Role): number {
  if (role === "DOCTOR") return 10_000_000;
  if (role === "NURSE" || role === "CONSULTANT") return 8_000_000;
  return 0;
}

export type PayrollRow = {
  id: string;
  name: string;
  code: string | null;
  role: Role;
  daysWorked: number;
  baseFull: number;
  baseActual: number;
  commission: number; // hoa hồng nhập tay theo tháng
  bonus: number;
  adjustment: number;
  total: number;
};

export async function getPayroll(monthDate: Date, standardDays = STANDARD_DAYS_DEFAULT) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const monthStr = format(monthDate, "yyyy-MM");

  const [users, monthCases, attendance, entries] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true, code: true, baseSalary: true },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte } },
      select: {
        commissionAmount: true,
        customer: { select: { source: true, sourceDetail: true } },
      },
    }),
    prisma.attendance.findMany({ where: { date: { gte, lte } }, select: { userId: true } }),
    prisma.payrollEntry.findMany({ where: { month: monthStr } }),
  ]);

  // Ngày công (Attendance đã unique theo user/ngày)
  const days = new Map<string, number>();
  for (const a of attendance) days.set(a.userId, (days.get(a.userId) ?? 0) + 1);

  const entryMap = new Map(entries.map((e) => [e.userId, e]));

  const rows: PayrollRow[] = users.map((u) => {
    const daysWorked = days.get(u.id) ?? 0;
    const baseFull = toNum(u.baseSalary) > 0 ? toNum(u.baseSalary) : roleBaseDefault(u.role);
    const ratio = standardDays > 0 ? Math.min(daysWorked / standardDays, 1) : 0;
    const baseActual = Math.round(baseFull * ratio);

    const e = entryMap.get(u.id);
    const commission = e ? toNum(e.commission) : 0;
    const bonus = e ? toNum(e.bonus) : 0;
    const adjustment = e ? toNum(e.adjustment) : 0;

    const total = baseActual + commission + bonus + adjustment;
    return { id: u.id, name: u.fullName, code: u.code, role: u.role, daysWorked, baseFull, baseActual, commission, bonus, adjustment, total };
  });

  // Hoa hồng cộng tác viên (theo nguồn khách) — số tiền nhập tay ở từng hồ sơ.
  const ctvMap = new Map<string, number>();
  for (const c of monthCases) {
    if (c.customer?.source === "COLLABORATOR") {
      const name = c.customer.sourceDetail?.trim() || "CTV chưa ghi tên";
      ctvMap.set(name, (ctvMap.get(name) ?? 0) + toNum(c.commissionAmount));
    }
  }
  const ctv = [...ctvMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    rows,
    ctv,
    standardDays,
    totalBase: rows.reduce((s, r) => s + r.baseActual, 0),
    totalCommission: rows.reduce((s, r) => s + r.commission, 0),
    totalBonus: rows.reduce((s, r) => s + r.bonus + r.adjustment, 0),
    totalStaff: rows.reduce((s, r) => s + r.total, 0),
    totalCtv: ctv.reduce((s, r) => s + r.amount, 0),
  };
}
