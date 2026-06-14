import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum, formatVNDShort } from "@/lib/money";
import type { Role } from "@/generated/prisma/client";

export const STANDARD_DAYS_DEFAULT = 26;
const NURSE_PER_CASE = 100_000;

/** Lương cứng mặc định theo vai trò (khi chưa đặt riêng cho nhân sự). */
function roleBaseDefault(role: Role): number {
  if (role === "DOCTOR") return 10_000_000;
  if (role === "NURSE" || role === "CONSULTANT") return 8_000_000;
  return 0;
}

// Bậc % hoa hồng tư vấn — áp theo TỔNG doanh thu tháng của mỗi tư vấn viên.
function rateNew(rev: number): number {
  return rev >= 800_000_000 ? 5 : rev >= 500_000_000 ? 4 : 3;
}
function rateOld(rev: number): number {
  return rev >= 500_000_000 ? 6 : rev >= 200_000_000 ? 5 : 4;
}

export type PayrollRow = {
  id: string;
  name: string;
  code: string | null;
  role: Role;
  daysWorked: number;
  baseFull: number;
  baseActual: number;
  commission: number;
  commissionNote: string;
  bonus: number;
  adjustment: number;
  nurseCases: number;
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
        customerId: true,
        createdAt: true,
        consultantId: true,
        doctorId: true,
        totalAmount: true,
        commissionAmount: true,
        customer: { select: { source: true, sourceDetail: true } },
      },
    }),
    prisma.attendance.findMany({ where: { date: { gte, lte } }, select: { userId: true } }),
    prisma.payrollEntry.findMany({ where: { month: monthStr } }),
  ]);

  // Khách mới vs khách cũ: hồ sơ là "khách cũ" nếu khách đã có hồ sơ trước đó.
  const custIds = [...new Set(monthCases.map((c) => c.customerId))];
  const earliest =
    custIds.length > 0
      ? await prisma.caseRecord.groupBy({
          by: ["customerId"],
          where: { customerId: { in: custIds } },
          _min: { createdAt: true },
        })
      : [];
  const earliestMap = new Map(earliest.map((e) => [e.customerId, e._min.createdAt?.getTime() ?? 0]));
  const isReturning = (c: { customerId: string; createdAt: Date }) =>
    c.createdAt.getTime() > (earliestMap.get(c.customerId) ?? 0);

  // Ngày công (Attendance đã unique theo user/ngày)
  const days = new Map<string, number>();
  for (const a of attendance) days.set(a.userId, (days.get(a.userId) ?? 0) + 1);

  const entryMap = new Map(entries.map((e) => [e.userId, e]));

  // Gom doanh thu theo người phụ trách
  const consNew = new Map<string, number>();
  const consOld = new Map<string, number>();
  const docService = new Map<string, number>();
  const docOldConsult = new Map<string, number>();
  const nurseConsult = new Map<string, number>();
  for (const c of monthCases) {
    const amt = toNum(c.totalAmount);
    const ret = isReturning(c);
    if (c.consultantId) {
      (ret ? consOld : consNew).set(c.consultantId, ((ret ? consOld : consNew).get(c.consultantId) ?? 0) + amt);
      if (ret) docOldConsult.set(c.consultantId, (docOldConsult.get(c.consultantId) ?? 0) + amt);
      nurseConsult.set(c.consultantId, (nurseConsult.get(c.consultantId) ?? 0) + amt);
    }
    if (c.doctorId) docService.set(c.doctorId, (docService.get(c.doctorId) ?? 0) + amt);
  }

  const rows: PayrollRow[] = users.map((u) => {
    const daysWorked = days.get(u.id) ?? 0;
    const baseFull = toNum(u.baseSalary) > 0 ? toNum(u.baseSalary) : roleBaseDefault(u.role);
    const ratio = standardDays > 0 ? Math.min(daysWorked / standardDays, 1) : 0;
    const baseActual = Math.round(baseFull * ratio);

    const e = entryMap.get(u.id);
    const bonus = e ? toNum(e.bonus) : 0;
    const adjustment = e ? toNum(e.adjustment) : 0;
    const nurseCases = e ? e.nurseCases : 0;

    let commission = 0;
    let commissionNote = "—";
    if (u.role === "CONSULTANT") {
      const rn = consNew.get(u.id) ?? 0;
      const ro = consOld.get(u.id) ?? 0;
      const cn = Math.round((rn * rateNew(rn)) / 100);
      const co = Math.round((ro * rateOld(ro)) / 100);
      commission = cn + co;
      commissionNote = `Mới ${formatVNDShort(rn)}×${rateNew(rn)}% + Cũ ${formatVNDShort(ro)}×${rateOld(ro)}%`;
    } else if (u.role === "DOCTOR") {
      const sv = docService.get(u.id) ?? 0;
      const oc = docOldConsult.get(u.id) ?? 0;
      const svCom = Math.round((sv * 8) / 100);
      const ocCom = Math.round((oc * 10) / 100);
      commission = svCom + ocCom;
      commissionNote = `DV ${formatVNDShort(sv)}×8% + TV cũ ${formatVNDShort(oc)}×10%`;
    } else if (u.role === "NURSE") {
      const nc = nurseConsult.get(u.id) ?? 0;
      const ncCom = Math.round((nc * 4) / 100);
      const caseCom = nurseCases * NURSE_PER_CASE;
      commission = ncCom + caseCom;
      commissionNote = `${nurseCases} ca×100k + TV ${formatVNDShort(nc)}×4%`;
    }

    const total = baseActual + commission + bonus + adjustment;
    return { id: u.id, name: u.fullName, code: u.code, role: u.role, daysWorked, baseFull, baseActual, commission, commissionNote, bonus, adjustment, nurseCases, total };
  });

  // Hoa hồng cộng tác viên (theo nguồn khách)
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
