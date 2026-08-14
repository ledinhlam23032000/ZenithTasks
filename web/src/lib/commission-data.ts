// ============================================================================
// TÍNH HOA HỒNG NHÂN SỰ — lớp thu thập dữ liệu (DB) cho lib/commission.ts.
// Gom số liệu cần thiết theo THÁNG rồi đưa vào các hàm toán thuần — module này
// không tự tính công thức, chỉ truy vấn + phân loại "khách mới/cũ".
//
// "Khách CŨ vì [nhân sự] X" = khách này đã có ÍT NHẤT 1 hồ sơ khác, trạng thái
// SERVICED/COMPLETED, tạo TRƯỚC hồ sơ đang xét, mà X là tư vấn viên HOẶC bác sĩ
// của hồ sơ đó (X đã từng thực sự phục vụ khách này trước đây — không tính hồ
// sơ người khác phụ trách). Áp dụng CHUNG cho cả bác sĩ (tiền tư vấn 0%/10%)
// lẫn tư vấn viên (bậc khách mới/cũ) — xem BAN-GIAO.md mục 7.
// ============================================================================

import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { correctedFinalPrice, summarizeCase } from "@/lib/financial-summary";
import { computeBaseActual } from "@/lib/payroll-pure";
import { computeCommissionBreakdown, type CommissionBreakdown } from "@/lib/commission";
import { DONE_CASE_STATUSES } from "@/lib/status";
import { STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { vnDateOnly } from "@/lib/dates";
import type { Role } from "@/generated/prisma/client";

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
  /** Từng dòng đóng góp vào hoa hồng — dùng cho phụ lục hoa hồng (xem lib/commission-appendix.ts). */
  details: CommissionCaseDetail[];
};

function roleBaseDefault(role: Role): number {
  if (role === "DOCTOR") return 10_000_000;
  if (role === "NURSE" || role === "CONSULTANT") return 8_000_000;
  return 0;
}

/**
 * Tính hoa hồng/phụ cấp GỢI Ý cho mọi nhân sự đang hoạt động trong 1 tháng.
 * KHÔNG ghi vào DB — chỉ đọc. Trang Lương hiển thị làm gợi ý; PayrollEntry.commission
 * vẫn là số ĐÃ LƯU (nhập tay hoặc đã chấp nhận gợi ý này), không tự ghi đè.
 */
export async function getCommissionForMonth(
  monthDate: Date,
  standardDays: number = STANDARD_DAYS_DEFAULT,
): Promise<Map<string, StaffCommissionResult>> {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const attGte = vnDateOnly(gte);
  const attLte = vnDateOnly(lte);

  const [users, attendance, monthCases, monthServices] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true, baseSalary: true },
    }),
    prisma.attendance.findMany({ where: { date: { gte: attGte, lte: attLte } }, select: { userId: true } }),
    prisma.caseRecord.findMany({
      where: { createdAt: { gte, lte } },
      select: {
        id: true,
        code: true,
        customerId: true,
        customer: { select: { fullName: true } },
        consultantId: true,
        createdAt: true,
        voucherAmount: true,
        services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
        payments: { select: { amount: true } },
      },
    }),
    prisma.caseService.findMany({
      where: { createdAt: { gte, lte }, doctorId: { not: null } },
      select: {
        id: true,
        caseId: true,
        nurseId: true,
        doctorId: true,
        name: true,
        listPrice: true,
        unitPrice: true,
        quantity: true,
        discount: true,
        finalPrice: true,
        createdAt: true,
        case: { select: { code: true, customer: { select: { fullName: true } } } },
      },
    }),
    // nurseId lọc riêng bên dưới (không thể where OR đơn giản khi cần cả 2 trường độc lập)
  ]);

  const nurseServices = await prisma.caseService.findMany({
    where: { createdAt: { gte, lte }, nurseId: { not: null } },
    select: {
      id: true,
      caseId: true,
      nurseId: true,
      createdAt: true,
      case: { select: { code: true, customer: { select: { fullName: true } } } },
    },
  });

  const usersById = new Map(users.map((u) => [u.id, u]));
  const days = new Map<string, number>();
  for (const a of attendance) days.set(a.userId, (days.get(a.userId) ?? 0) + 1);

  // ---- Khách mới/cũ: gom lịch sử hồ sơ ĐÃ HOÀN TẤT của mọi khách xuất hiện trong tháng ----
  const customerIds = [...new Set(monthCases.map((c) => c.customerId))];
  const history = customerIds.length
    ? await prisma.caseRecord.findMany({
        where: { customerId: { in: customerIds }, status: { in: DONE_CASE_STATUSES } },
        select: { customerId: true, consultantId: true, doctorId: true, createdAt: true },
      })
    : [];
  // customerId -> Set(staffId đã từng phục vụ khách này, mốc thời gian sớm nhất không cần thiết
  // vì ta so trực tiếp createdAt < hồ sơ đang xét bên dưới bằng danh sách đầy đủ.
  const historyByCustomer = new Map<string, { staffId: string; createdAt: Date }[]>();
  for (const h of history) {
    const entries = historyByCustomer.get(h.customerId) ?? [];
    if (h.consultantId) entries.push({ staffId: h.consultantId, createdAt: h.createdAt });
    if (h.doctorId) entries.push({ staffId: h.doctorId, createdAt: h.createdAt });
    historyByCustomer.set(h.customerId, entries);
  }
  function isReturningFor(customerId: string, staffId: string, beforeDate: Date): boolean {
    const entries = historyByCustomer.get(customerId);
    if (!entries) return false;
    return entries.some((e) => e.staffId === staffId && e.createdAt < beforeDate);
  }

  // ---- Gom theo nhân sự ----
  const doctorServiceRevenue = new Map<string, number>();
  const doctorConsultRevenue = new Map<string, number>();
  const nurseCaseCount = new Map<string, number>();
  const nurseConsultRevenue = new Map<string, number>();
  const consultantNewRevenue = new Map<string, number>();
  const consultantReturningRevenue = new Map<string, number>();
  const detailsByUser = new Map<string, CommissionCaseDetail[]>();
  function pushDetail(userId: string, d: CommissionCaseDetail) {
    const arr = detailsByUser.get(userId) ?? [];
    arr.push(d);
    detailsByUser.set(userId, arr);
  }

  // 8% dịch vụ — theo TỪNG dòng dịch vụ, người thực hiện = CaseService.doctorId
  for (const s of monthServices) {
    if (!s.doctorId) continue;
    const revenue = correctedFinalPrice(s);
    doctorServiceRevenue.set(s.doctorId, (doctorServiceRevenue.get(s.doctorId) ?? 0) + revenue);
    if (revenue > 0) {
      pushDetail(s.doctorId, {
        caseId: s.caseId,
        caseCode: s.case.code,
        customerName: s.case.customer?.fullName ?? "—",
        date: s.createdAt,
        role: "doctor-service",
        rate: 0.08,
        base: revenue,
        amount: Math.round(revenue * 0.08),
      });
    }
  }

  // 100k/ca điều dưỡng phụ trách
  for (const s of nurseServices) {
    if (!s.nurseId) continue;
    nurseCaseCount.set(s.nurseId, (nurseCaseCount.get(s.nurseId) ?? 0) + 1);
    pushDetail(s.nurseId, {
      caseId: s.caseId,
      caseCode: s.case.code,
      customerName: s.case.customer?.fullName ?? "—",
      date: s.createdAt,
      role: "nurse-service",
      rate: 0,
      base: 1,
      amount: 100_000,
    });
  }

  // Tiền tư vấn — theo HỒ SƠ, người tư vấn = CaseRecord.consultantId. Cách áp dụng
  // phụ thuộc VAI TRÒ của người đó (bác sĩ: 0%/10% · điều dưỡng: 4% mọi trường hợp ·
  // tư vấn viên: bậc trọn gói khách mới/cũ). Vai trò khác: không có công thức, bỏ qua
  // (vẫn thưởng/điều chỉnh nhập tay được như cũ).
  for (const c of monthCases) {
    if (!c.consultantId) continue;
    const consultant = usersById.get(c.consultantId);
    if (!consultant) continue;
    const total = summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount }).total;
    if (total <= 0) continue;
    const returning = isReturningFor(c.customerId, c.consultantId, c.createdAt);

    if (consultant.role === "DOCTOR") {
      if (returning) {
        doctorConsultRevenue.set(c.consultantId, (doctorConsultRevenue.get(c.consultantId) ?? 0) + total);
        pushDetail(c.consultantId, {
          caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: c.createdAt,
          role: "doctor-consult", rate: 0.1, base: total, amount: Math.round(total * 0.1),
        });
      }
      // khách mới: 0% — không cộng gì, không cần ghi dòng phụ lục (không có tiền)
    } else if (consultant.role === "NURSE") {
      nurseConsultRevenue.set(c.consultantId, (nurseConsultRevenue.get(c.consultantId) ?? 0) + total);
      pushDetail(c.consultantId, {
        caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: c.createdAt,
        role: "nurse-consult", rate: 0.04, base: total, amount: Math.round(total * 0.04),
      });
    } else if (consultant.role === "CONSULTANT") {
      if (returning) consultantReturningRevenue.set(c.consultantId, (consultantReturningRevenue.get(c.consultantId) ?? 0) + total);
      else consultantNewRevenue.set(c.consultantId, (consultantNewRevenue.get(c.consultantId) ?? 0) + total);
      pushDetail(c.consultantId, {
        caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, date: c.createdAt,
        role: returning ? "consultant-returning" : "consultant-new", rate: 0, base: total, amount: 0, // bậc trọn gói tính SAU khi biết tổng cả tháng — xem ghi chú dưới
      });
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
    // Bậc tư vấn viên tính TRỌN GÓI trên TỔNG doanh số cả tháng — số tiền mỗi
    // dòng phụ lục ở trên chưa biết tỉ lệ lúc ghi (phải biết tổng trước), điền
    // lại đúng tỉ lệ/​số tiền theo tỉ trọng doanh số dòng đó trong tổng bậc.
    const details = (detailsByUser.get(u.id) ?? []).map((d) => {
      if (d.role === "consultant-new" && breakdown.consultant.newRevenue > 0) {
        return { ...d, rate: breakdown.consultant.newRate, amount: Math.round(d.base * breakdown.consultant.newRate) };
      }
      if (d.role === "consultant-returning" && breakdown.consultant.returningRevenue > 0) {
        return { ...d, rate: breakdown.consultant.returningRate, amount: Math.round(d.base * breakdown.consultant.returningRate) };
      }
      return d;
    });
    result.set(u.id, { userId: u.id, role: u.role, breakdown, details: details.sort((a, b) => a.date.getTime() - b.date.getTime()) });
  }
  return result;
}
