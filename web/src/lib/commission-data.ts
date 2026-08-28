// ============================================================================
// TÍNH HOA HỒNG THEO TIỀN THỰC THU — lớp thu thập dữ liệu từ DB.
// Mỗi Payment chỉ được tính căn cứ đúng 1 lần cho doanh thu trung tâm. Khi tính
// hoa hồng theo vai trò, cùng một khoản có thể tạo ra nhiều "góc nhìn" hợp lệ
// (bác sĩ, tư vấn viên, điều dưỡng) nhưng tổng thu trung tâm vẫn chỉ đếm 1 lần.
// ============================================================================

import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { correctedFinalPrice } from "@/lib/financial-summary";
import { computeBaseActual } from "@/lib/payroll-pure";
import { allocateDoctorServiceBase, computeCommissionBreakdown, type CommissionBreakdown } from "@/lib/commission";
import { DONE_CASE_STATUSES } from "@/lib/status";
const STANDARD_DAYS_DEFAULT = 26;
import { vnDateOnly } from "@/lib/dates";
import type { Role, RevenueAllocationRole } from "@/generated/prisma/client";

export type CommissionCaseDetail = {
  caseId: string;
  caseCode: string;
  customerName: string;
  date: Date;
  role: "doctor-service" | "doctor-consult" | "nurse-service" | "nurse-consult" | "consultant-new" | "consultant-returning";
  rate: number;
  base: number;
  amount: number;
};

export type StaffCommissionResult = {
  userId: string;
  role: Role;
  breakdown: CommissionBreakdown;
  details: CommissionCaseDetail[];
};

type UserLite = { id: string; fullName: string; role: Role; baseSalary: unknown };
type PaymentRow = {
  amount: unknown;
  paidAt: Date;
  case: {
    id: string;
    code: string;
    createdAt: Date;
    consultantId: string | null;
    doctorId: string | null;
    customerId: string;
    customer: { fullName: string };
    services: Array<{ id: string; finalPrice: unknown; unitPrice: unknown; listPrice: unknown; quantity: unknown; discount: unknown; doctorId: string | null; nurseId: string | null }>;
    revenueAllocations: Array<{ userId: string; role: RevenueAllocationRole; shareBps: number }>;
  };
};

function roleBaseDefault(role: Role): number {
  if (role === "DOCTOR") return 10_000_000;
  if (role === "NURSE" || role === "CONSULTANT") return 8_000_000;
  return 0;
}

function add(map: Map<string, number>, userId: string, amount: number) {
  if (amount <= 0) return;
  map.set(userId, (map.get(userId) ?? 0) + amount);
}

function pushDetail(map: Map<string, CommissionCaseDetail[]>, userId: string, detail: CommissionCaseDetail) {
  if (detail.base <= 0 && detail.amount <= 0) return;
  const list = map.get(userId) ?? [];
  list.push(detail);
  map.set(userId, list);
}

function allocationFor(caseRow: PaymentRow["case"], role: RevenueAllocationRole): Array<{ userId: string; shareBps: number }> {
  const explicit = caseRow.revenueAllocations.filter((a) => a.role === role && a.shareBps > 0);
  if (explicit.length) return explicit;
  if (role === "CONSULTANT" && caseRow.consultantId) return [{ userId: caseRow.consultantId, shareBps: 10_000 }];
  if (role === "DOCTOR" && caseRow.doctorId) return [{ userId: caseRow.doctorId, shareBps: 10_000 }];
  return [];
}

function allocatePayment(amount: number, shares: Array<{ userId: string; shareBps: number }>): Array<{ userId: string; amount: number }> {
  const total = Math.max(0, Math.round(amount));
  if (!shares.length || total <= 0) return [];
  const totalBps = shares.reduce((sum, item) => sum + item.shareBps, 0);
  let assigned = 0;
  return shares.map((item, index) => {
    const value = index === shares.length - 1
      ? Math.max(0, total - assigned)
      : Math.floor((total * item.shareBps) / totalBps);
    assigned += value;
    return { userId: item.userId, amount: value };
  });
}

function serviceRevenue(service: PaymentRow["case"]["services"][number]): number {
  return Math.max(0, Math.round(toNum(correctedFinalPrice(service))));
}

function roleConsultantIsReturning(
  customerId: string,
  staffId: string,
  beforeDate: Date,
  historyByCustomer: Map<string, Array<{ staffId: string; createdAt: Date }>>,
): boolean {
  return (historyByCustomer.get(customerId) ?? []).some((item) => item.staffId === staffId && item.createdAt < beforeDate);
}

/**
 * Tính hoa hồng/phụ cấp gợi ý cho mọi nhân sự đang hoạt động trong tháng.
 * Căn cứ hoa hồng là Payment.paidAt, không phải tổng giá trị chốt hay công nợ.
 * PayrollEntry.commissionOverride (nếu có) được cộng riêng ở lớp payroll.
 */
export async function getCommissionForMonth(
  monthDate: Date,
  standardDays: number = STANDARD_DAYS_DEFAULT,
): Promise<Map<string, StaffCommissionResult>> {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const attGte = vnDateOnly(gte);
  const attLte = vnDateOnly(lte);

  const [users, attendance, monthPayments, history] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true, baseSalary: true },
    }),
    prisma.attendance.findMany({ where: { date: { gte: attGte, lte: attLte } }, select: { userId: true } }),
    prisma.payment.findMany({
      where: { paidAt: { gte, lte } },
      orderBy: { paidAt: "asc" },
      select: {
        amount: true,
        paidAt: true,
        case: {
          select: {
            id: true,
            code: true,
            createdAt: true,
            consultantId: true,
            doctorId: true,
            customerId: true,
            customer: { select: { fullName: true } },
            services: { select: { id: true, finalPrice: true, unitPrice: true, listPrice: true, quantity: true, discount: true, doctorId: true, nurseId: true } },
            revenueAllocations: { select: { userId: true, role: true, shareBps: true } },
          },
        },
      },
    }),
    prisma.caseRecord.findMany({
      where: { status: { in: DONE_CASE_STATUSES } },
      select: { customerId: true, consultantId: true, doctorId: true, createdAt: true },
    }),
  ]);

  const usersById = new Map<string, UserLite>(users.map((u) => [u.id, u]));
  const days = new Map<string, number>();
  for (const row of attendance) days.set(row.userId, (days.get(row.userId) ?? 0) + 1);
  const historyByCustomer = new Map<string, Array<{ staffId: string; createdAt: Date }>>();
  for (const row of history) {
    const list = historyByCustomer.get(row.customerId) ?? [];
    if (row.consultantId) list.push({ staffId: row.consultantId, createdAt: row.createdAt });
    if (row.doctorId) list.push({ staffId: row.doctorId, createdAt: row.createdAt });
    historyByCustomer.set(row.customerId, list);
  }

  const doctorServiceRevenue = new Map<string, number>();
  const doctorConsultRevenue = new Map<string, number>();
  const nurseCaseCount = new Map<string, number>();
  const nurseConsultRevenue = new Map<string, number>();
  const consultantNewRevenue = new Map<string, number>();
  const consultantReturningRevenue = new Map<string, number>();
  const detailsByUser = new Map<string, CommissionCaseDetail[]>();
  const nurseFeeCases = new Set<string>();

  for (const payment of monthPayments as unknown as PaymentRow[]) {
    const paid = Math.max(0, Math.round(toNum(payment.amount)));
    if (!paid) continue;
    const c = payment.case;

    // 1) Tư vấn: phân bổ theo tỷ lệ phối hợp nếu có, fallback về consultantId.
    for (const item of allocatePayment(paid, allocationFor(c, "CONSULTANT"))) {
      const staff = usersById.get(item.userId);
      if (!staff) continue;
      const returning = roleConsultantIsReturning(c.customerId, item.userId, c.createdAt, historyByCustomer);
      if (staff.role === "DOCTOR") {
        if (returning) {
          add(doctorConsultRevenue, item.userId, item.amount);
          pushDetail(detailsByUser, item.userId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: "doctor-consult", rate: 0.1, base: item.amount, amount: Math.round(item.amount * 0.1) });
        }
      } else if (staff.role === "NURSE") {
        add(nurseConsultRevenue, item.userId, item.amount);
        pushDetail(detailsByUser, item.userId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: "nurse-consult", rate: 0.04, base: item.amount, amount: Math.round(item.amount * 0.04) });
      } else if (staff.role === "CONSULTANT") {
        if (returning) add(consultantReturningRevenue, item.userId, item.amount);
        else add(consultantNewRevenue, item.userId, item.amount);
        pushDetail(detailsByUser, item.userId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: returning ? "consultant-returning" : "consultant-new", rate: 0, base: item.amount, amount: 0 });
      }
    }

    // 2) Bác sĩ thực hiện dịch vụ: tiền thanh toán được chia theo tỷ trọng giá trị
    // các dòng dịch vụ có bác sĩ. Nếu hồ sơ chưa gắn ở dòng, fallback doctorId.
    // Mẫu số là TOÀN BỘ dịch vụ của hồ sơ, không chỉ các dòng có bác sĩ — nếu lấy
    // mẫu số là tổng dòng-có-bác-sĩ thì tổng phân bổ luôn bằng đúng `paid` và phần
    // dịch vụ không gắn ai bị hút sang bác sĩ (xem allocateDoctorServiceBase).
    const serviceRows = c.services.filter((s) => s.doctorId);
    const totalCaseServiceRevenue = c.services.reduce((sum, s) => sum + serviceRevenue(s), 0);
    const allocations = allocateDoctorServiceBase(
      paid,
      serviceRows.map((s) => ({ doctorId: s.doctorId as string, revenue: serviceRevenue(s) })),
      totalCaseServiceRevenue,
    );
    if (allocations.length > 0) {
      for (const { doctorId, base } of allocations) {
        add(doctorServiceRevenue, doctorId, base);
        pushDetail(detailsByUser, doctorId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: "doctor-service", rate: 0.08, base, amount: Math.round(base * 0.08) });
      }
    } else if (c.doctorId) {
      add(doctorServiceRevenue, c.doctorId, paid);
      pushDetail(detailsByUser, c.doctorId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: "doctor-service", rate: 0.08, base: paid, amount: Math.round(paid * 0.08) });
    }

    // 3) Điều dưỡng: phí cố định 100.000đ cho mỗi dòng dịch vụ phụ trách,
    // chỉ ghi nhận một lần trong tháng và chỉ khi hồ sơ đã phát sinh tiền thực thu.
    if (!nurseFeeCases.has(c.id)) {
      nurseFeeCases.add(c.id);
      for (const service of c.services) {
        if (!service.nurseId) continue;
        add(nurseCaseCount, service.nurseId, 1);
        pushDetail(detailsByUser, service.nurseId, { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: payment.paidAt, role: "nurse-service", rate: 0, base: 1, amount: 100_000 });
      }
    }
  }

  const result = new Map<string, StaffCommissionResult>();
  for (const u of users) {
    const daysWorked = days.get(u.id) ?? 0;
    const baseFull = toNum(u.baseSalary) > 0 ? toNum(u.baseSalary) : roleBaseDefault(u.role);
    const attendanceWage = computeBaseActual(baseFull, daysWorked, standardDays);
    const breakdown = computeCommissionBreakdown({
      attendanceWage,
      daysWorked,
      doctorServiceRevenue: doctorServiceRevenue.get(u.id) ?? 0,
      doctorReturningConsultRevenue: doctorConsultRevenue.get(u.id) ?? 0,
      nurseCaseCount: nurseCaseCount.get(u.id) ?? 0,
      nurseConsultRevenue: nurseConsultRevenue.get(u.id) ?? 0,
      consultantNewRevenue: consultantNewRevenue.get(u.id) ?? 0,
      consultantReturningRevenue: consultantReturningRevenue.get(u.id) ?? 0,
    });
    const details = (detailsByUser.get(u.id) ?? []).map((d) => {
      if (d.role === "consultant-new" && breakdown.consultant.newRevenue > 0) return { ...d, rate: breakdown.consultant.newRate, amount: Math.round(d.base * breakdown.consultant.newRate) };
      if (d.role === "consultant-returning" && breakdown.consultant.returningRevenue > 0) return { ...d, rate: breakdown.consultant.returningRate, amount: Math.round(d.base * breakdown.consultant.returningRate) };
      return d;
    });
    result.set(u.id, { userId: u.id, role: u.role, breakdown, details: details.sort((a, b) => a.date.getTime() - b.date.getTime()) });
  }
  return result;
}
