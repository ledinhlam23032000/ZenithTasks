import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { loadCaseFinancials } from "@/lib/financial-summary-db";
import { vnDateOnly } from "@/lib/dates";
import { collectionsByStaff, collectionsTotal, type StaffCollection } from "@/lib/collections";
import { computeBaseActual, debtByStaff } from "@/lib/payroll-pure";
import type { Role } from "@/generated/prisma/client";

export const STANDARD_DAYS_DEFAULT = 26;

/** Lương cứng mặc định theo vai trò (khi chưa đặt riêng cho nhân sự). */
function roleBaseDefault(role: Role): number {
  if (role === "DOCTOR") return 10_000_000;
  if (role === "NURSE" || role === "CONSULTANT") return 8_000_000;
  return 0;
}

const EMPTY_COLLECTION: StaffCollection = { total: 0, fromNew: 0, fromDebt: 0 };

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
  collectedConsult: StaffCollection; // thực thu trong tháng theo vai trò TƯ VẤN (gồm thu nợ ca cũ)
  collectedDoctor: StaffCollection; // thực thu trong tháng theo vai trò BÁC SĨ
  debtOutstanding: number; // khách của mình (tư vấn/bác sĩ) còn nợ cộng dồn tới hiện tại
  hasEntry: boolean; // đã lưu PayrollEntry cho tháng này chưa (phân biệt "chưa nhập" ≠ "nhập 0 có chủ đích")
  prevCommission: number; // hoa hồng/thưởng/điều chỉnh tháng LIỀN TRƯỚC — dùng làm gợi ý mốc khi tháng này chưa nhập
  prevBonus: number;
  prevAdjustment: number;
  // ----- Kế toán: đã chi lương chưa (xem lib/accounting.ts) -----
  paid: number; // số tiền đã ghi sổ chi
  paidAt: Date | null;
  cashTxId: string | null;
};

export async function getPayroll(monthDate: Date, standardDays = STANDARD_DAYS_DEFAULT) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  // Attendance.date là cột @db.Date — PHẢI dùng mốc UTC-midnight riêng (vnDateOnly),
  // KHÔNG dùng chung gte/lte (giờ LOCAL) ở trên: so trực tiếp sẽ khiến ngày cuối tháng
  // trước lẫn vào tháng sau (Postgres/Prisma cắt tham số về NGÀY theo giờ UTC của phiên
  // khi so với cột DATE — xem giải thích đầy đủ ở cham-cong/page.tsx).
  const attGte = vnDateOnly(gte);
  const attLte = vnDateOnly(lte);
  const monthStr = format(monthDate, "yyyy-MM");
  const prevMonthStr = format(subMonths(monthDate, 1), "yyyy-MM");

  const [users, monthCases, attendance, entries, prevEntries, monthPayments, debtCases] = await Promise.all([
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
    prisma.attendance.findMany({ where: { date: { gte: attGte, lte: attLte } }, select: { userId: true } }),
    prisma.payrollEntry.findMany({ where: { month: monthStr } }),
    prisma.payrollEntry.findMany({ where: { month: prevMonthStr } }),
    prisma.payment.findMany({
      where: { paidAt: { gte, lte } },
      select: {
        amount: true,
        paidAt: true,
        case: { select: { createdAt: true, consultantId: true, doctorId: true } },
      },
    }),
    prisma.caseRecord.findMany({
      where: {},
      select: {
        id: true,
        consultantId: true,
        doctorId: true,
      },
    }),
  ]);

  // Thực thu trong tháng theo nhân sự (tiền thật đã về, gồm thu nợ từ ca các tháng trước)
  const attributions = monthPayments.map((p) => ({
    amount: toNum(p.amount),
    paidAt: p.paidAt,
    caseCreatedAt: p.case.createdAt,
    consultantId: p.case.consultantId,
    doctorId: p.case.doctorId,
  }));
  const collected = collectionsByStaff(attributions, gte);
  const collectedAll = collectionsTotal(attributions, gte);
  const debtFinancials = await loadCaseFinancials(debtCases.map((c) => c.id));
  const debtByStaffMap = debtByStaff(
    debtCases.map((c) => ({
      consultantId: c.consultantId,
      doctorId: c.doctorId,
      debt: debtFinancials.get(c.id)?.debt ?? 0,
    })),
  );

  // Ngày công (Attendance đã unique theo user/ngày)
  const days = new Map<string, number>();
  for (const a of attendance) days.set(a.userId, (days.get(a.userId) ?? 0) + 1);

  const entryMap = new Map(entries.map((e) => [e.userId, e]));
  const prevEntryMap = new Map(prevEntries.map((e) => [e.userId, e]));

  const rows: PayrollRow[] = users.map((u) => {
    const daysWorked = days.get(u.id) ?? 0;
    const baseFull = toNum(u.baseSalary) > 0 ? toNum(u.baseSalary) : roleBaseDefault(u.role);
    const baseActual = computeBaseActual(baseFull, daysWorked, standardDays);

    const e = entryMap.get(u.id);
    const hasEntry = !!e;
    const commission = e ? toNum(e.commission) : 0;
    const bonus = e ? toNum(e.bonus) : 0;
    const adjustment = e ? toNum(e.adjustment) : 0;

    const pe = prevEntryMap.get(u.id);
    const prevCommission = pe ? toNum(pe.commission) : 0;
    const prevBonus = pe ? toNum(pe.bonus) : 0;
    const prevAdjustment = pe ? toNum(pe.adjustment) : 0;

    const total = baseActual + commission + bonus + adjustment;
    const collectedConsult = collected.consultants.get(u.id) ?? EMPTY_COLLECTION;
    const collectedDoctor = collected.doctors.get(u.id) ?? EMPTY_COLLECTION;
    const debtOutstanding = debtByStaffMap.get(u.id) ?? 0;
    return {
      id: u.id, name: u.fullName, code: u.code, role: u.role, daysWorked, baseFull, baseActual,
      commission, bonus, adjustment, total, collectedConsult, collectedDoctor, debtOutstanding,
      hasEntry, prevCommission, prevBonus, prevAdjustment,
      paid: e ? toNum(e.paidAmount) : 0,
      paidAt: e?.paidAt ?? null,
      cashTxId: e?.cashTxId ?? null,
    };
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
    collectedAll, // thực thu toàn trung tâm trong tháng (mỗi khoản đếm 1 lần)
    totalPaid: rows.reduce((s, r) => s + r.paid, 0), // tổng lương ĐÃ ghi sổ chi (kế toán)
  };
}

export type PayrollTrendPoint = { label: string; totalStaff: number; totalCommission: number };

/** Tổng chi lương + hoa hồng theo N tháng gần nhất (tính tới tháng hiện tại) — dùng vẽ biểu đồ xu hướng. */
export async function getPayrollTrend(monthsBack = 6): Promise<PayrollTrendPoint[]> {
  const now = new Date();
  const months = Array.from({ length: monthsBack }, (_, i) => subMonths(now, monthsBack - 1 - i));
  const results = await Promise.all(months.map((d) => getPayroll(d)));
  return months.map((d, i) => ({
    label: format(d, "MM/yyyy"),
    totalStaff: results[i].totalStaff,
    totalCommission: results[i].totalCommission,
  }));
}
