"use server";

// LƯU Ý (xem BAN-GIAO.md §8.1): các action ở đây dùng chung với `useFormAction`
// nên KHÔNG gọi `revalidatePath` — mọi trang dữ liệu đều `force-dynamic` (tự tải
// mới khi mở), còn trang hiện tại do `router.refresh()` phía client lo. Gọi
// revalidatePath sẽ khiến Next gộp việc render lại cả trang vào phản hồi của
// action → nút bấm "xoay mãi" khi mạng tới máy chủ phòng khám chậm.

import { format, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import {
  getMonthlyAccounting,
  isMonthClosed,
  SALARY_CATEGORY,
  COMMISSION_CATEGORY,
} from "@/lib/accounting";
import type { PaymentMethod } from "@/generated/prisma/client";
import { paymentRequestNo } from "@/lib/payment-request";

export type AccState = { ok?: boolean; error?: string };

const MONTH_RE = /^\d{4}-\d{2}$/;
const METHODS = ["CASH", "CARD", "TRANSFER", "EWALLET"];

function monthDate(month: string): Date {
  return new Date(`${month}-01T00:00:00`);
}

/** Ngày ghi sổ: mặc định là ngày cuối tháng lương (có thể chọn ngày khác). */
function payDate(raw: FormDataEntryValue | null, month: string): Date {
  const s = String(raw ?? "");
  if (s) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return endOfMonth(monthDate(month));
}

function payMethod(raw: FormDataEntryValue | null): PaymentMethod {
  const s = String(raw ?? "CASH");
  return (METHODS.includes(s) ? s : "CASH") as PaymentMethod;
}

function standardDaysOf(raw: FormDataEntryValue | null): number {
  return Math.max(1, Math.min(31, Number(raw) || STANDARD_DAYS_DEFAULT));
}

// ============================ CHI LƯƠNG NHÂN VIÊN ============================

/**
 * Ghi sổ chi lương cho MỘT nhân sự: tạo phiếu chi (hạng mục "Lương nhân viên")
 * trong Sổ thu chi rồi đánh dấu đã trả trong bảng lương. Nhờ vậy tiền lương
 * xuất hiện đúng trong dòng tiền mà không phải nhập tay lần thứ hai.
 */
export async function payStaffSalary(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.pay");
  const userId = String(formData.get("userId") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!userId || !MONTH_RE.test(month)) return { error: "Thiếu thông tin nhân sự hoặc tháng." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã chốt sổ — mở lại sổ trước khi chi lương.` };

  const standardDays = standardDaysOf(formData.get("standardDays"));
  const p = await getPayroll(monthDate(month), standardDays);
  const row = p.rows.find((r) => r.id === userId);
  if (!row) return { error: "Không tìm thấy nhân sự trong bảng lương tháng này." };
  if (row.cashTxId) return { error: `Đã ghi sổ chi lương cho ${row.name} rồi.` };
  if (row.total <= 0) return { error: `${row.name} không có lương phải trả trong tháng này.` };

  const when = payDate(formData.get("occurredAt"), month);
  const method = payMethod(formData.get("method"));

  await prisma.$transaction(async (tx) => {
    const request = await tx.paymentRequest.create({
      data: {
        requestNo: paymentRequestNo(),
        type: "SALARY",
        status: "PAID",
        requesterId: user.id,
        approverId: user.id,
        payeeUserId: row.id,
        payeeName: row.name,
        amount: row.total,
        reason: `Thanh toán lương tháng ${format(monthDate(month), "MM/yyyy")}`,
        month,
        approvedAt: new Date(),
        paidAt: new Date(),
        details: { category: SALARY_CATEGORY, source: "payroll" },
      },
    });
    const cashTx = await tx.cashTransaction.create({
      data: {
        type: "EXPENSE",
        category: SALARY_CATEGORY,
        amount: row.total,
        occurredAt: when,
        method,
        vendor: row.name,
        note: `Lương tháng ${format(monthDate(month), "MM/yyyy")}`,
        createdById: user.id,
        paymentRequestId: request.id,
      },
    });
    await tx.payrollEntry.upsert({
      where: { userId_month: { userId, month } },
      create: {
        userId,
        month,
        commission: 0,
        commissionOverride: row.commissionOverride || null,
        bonus: row.bonus,
        adjustment: row.adjustment,
        paidAmount: row.total,
        paidAt: new Date(),
        cashTxId: cashTx.id,
        paymentRequestId: request.id,
      },
      update: { paidAmount: row.total, paidAt: new Date(), cashTxId: cashTx.id, paymentRequestId: request.id },
    });
    await auditRequired(tx, user.id, "PAY_SALARY", {
      entity: "PayrollEntry",
      entityId: userId,
      meta: { month, amount: row.total, name: row.name },
    });
  });
  return { ok: true };
}

/** Ghi sổ chi lương cho TẤT CẢ nhân sự còn lại của tháng (bỏ qua người đã chi). */
export async function payAllSalaries(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.pay");
  const month = String(formData.get("month") ?? "");
  if (!MONTH_RE.test(month)) return { error: "Tháng không hợp lệ." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã chốt sổ — mở lại sổ trước khi chi lương.` };

  const standardDays = standardDaysOf(formData.get("standardDays"));
  const p = await getPayroll(monthDate(month), standardDays);
  const pending = p.rows.filter((r) => !r.cashTxId && r.total > 0);
  if (pending.length === 0) return { error: "Tất cả nhân sự đã được ghi sổ chi lương." };

  const when = payDate(formData.get("occurredAt"), month);
  const method = payMethod(formData.get("method"));
  const label = `Lương tháng ${format(monthDate(month), "MM/yyyy")}`;

  await prisma.$transaction(async (tx) => {
    for (const row of pending) {
      const request = await tx.paymentRequest.create({
        data: {
          requestNo: paymentRequestNo(),
          type: "SALARY",
          status: "PAID",
          requesterId: user.id,
          approverId: user.id,
          payeeUserId: row.id,
          payeeName: row.name,
          amount: row.total,
          reason: label,
          month,
          approvedAt: new Date(),
          details: { category: SALARY_CATEGORY, source: "payroll" },
        },
      });
      const cashTx = await tx.cashTransaction.create({
        data: {
          type: "EXPENSE",
          category: SALARY_CATEGORY,
          amount: row.total,
          occurredAt: when,
          method,
          vendor: row.name,
          note: label,
          createdById: user.id,
          paymentRequestId: request.id,
        },
      });
      await tx.payrollEntry.upsert({
        where: { userId_month: { userId: row.id, month } },
        create: {
          userId: row.id,
          month,
          commission: 0,
          commissionOverride: row.commissionOverride || null,
          bonus: row.bonus,
          adjustment: row.adjustment,
          paidAmount: row.total,
          paidAt: new Date(),
          cashTxId: cashTx.id,
          paymentRequestId: request.id,
        },
        update: { paidAmount: row.total, paidAt: new Date(), cashTxId: cashTx.id, paymentRequestId: request.id },
      });
    }
    await auditRequired(tx, user.id, "PAY_SALARY_ALL", {
      entity: "PayrollEntry",
      meta: { month, count: pending.length, total: pending.reduce((s, r) => s + r.total, 0) },
    });
  });
  return { ok: true };
}

/** Hoàn tác ghi sổ chi lương của một nhân sự (xóa luôn phiếu chi tương ứng). */
export async function undoStaffSalary(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.pay");
  const userId = String(formData.get("userId") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!userId || !MONTH_RE.test(month)) return { error: "Thiếu thông tin nhân sự hoặc tháng." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã chốt sổ — mở lại sổ trước khi sửa.` };

  const entry = await prisma.payrollEntry.findUnique({ where: { userId_month: { userId, month } } });
  if (!entry?.cashTxId) return { error: "Khoản lương này chưa được ghi sổ." };

  const cashTxId = entry.cashTxId;
  await prisma.$transaction(async (tx) => {
    await tx.payrollEntry.update({
      where: { id: entry.id },
      data: { paidAmount: 0, paidAt: null, cashTxId: null, paymentRequestId: null },
    });
    const cashTx = await tx.cashTransaction.findUnique({ where: { id: cashTxId }, select: { paymentRequestId: true } });
    await tx.cashTransaction.delete({ where: { id: cashTxId } });
    if (cashTx?.paymentRequestId) await tx.paymentRequest.update({ where: { id: cashTx.paymentRequestId }, data: { status: "CANCELLED", paidAt: null } });
    await auditRequired(tx, user.id, "UNDO_PAY_SALARY", { entity: "PayrollEntry", entityId: userId, meta: { month } });
  });
  return { ok: true };
}

// ======================= CHI HOA HỒNG CỘNG TÁC VIÊN =======================

/** Ghi sổ chi hoa hồng cho một cộng tác viên trong tháng. */
export async function payCtvCommission(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.pay");
  const name = String(formData.get("name") ?? "").trim();
  const month = String(formData.get("month") ?? "");
  if (!name || !MONTH_RE.test(month)) return { error: "Thiếu tên cộng tác viên hoặc tháng." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã chốt sổ — mở lại sổ trước khi chi.` };

  const p = await getPayroll(monthDate(month), standardDaysOf(formData.get("standardDays")));
  const ctv = p.ctv.find((c) => c.name === name);
  if (!ctv || ctv.amount <= 0) return { error: `Cộng tác viên ${name} không có hoa hồng trong tháng này.` };

  const existing = await prisma.commissionPayout.findUnique({ where: { name_month: { name, month } } });
  if (existing) return { error: `Đã ghi sổ chi hoa hồng cho ${name} rồi.` };
  const collaborator = await prisma.collaborator.findUnique({ where: { name }, select: { id: true } });

  const when = payDate(formData.get("occurredAt"), month);
  const method = payMethod(formData.get("method"));

  await prisma.$transaction(async (tx) => {
    const request = await tx.paymentRequest.create({
      data: {
        requestNo: paymentRequestNo(),
        type: "COLLABORATOR",
        status: "PAID",
        requesterId: user.id,
        approverId: user.id,
        payeeCollaboratorId: collaborator?.id ?? null,
        payeeName: name,
        amount: ctv.amount,
        reason: `Thanh toán hoa hồng cộng tác viên tháng ${format(monthDate(month), "MM/yyyy")}`,
        month,
        approvedAt: new Date(),
        paidAt: new Date(),
        details: { category: COMMISSION_CATEGORY, source: "collaborator" },
      },
    });
    const cashTx = await tx.cashTransaction.create({
      data: {
        type: "EXPENSE",
        category: COMMISSION_CATEGORY,
        amount: ctv.amount,
        occurredAt: when,
        method,
        vendor: name,
        note: `Hoa hồng cộng tác viên tháng ${format(monthDate(month), "MM/yyyy")}`,
        createdById: user.id,
        paymentRequestId: request.id,
      },
    });
    const payout = await tx.commissionPayout.create({
      data: { collaboratorId: collaborator?.id ?? null, name, month, amount: ctv.amount, cashTxId: cashTx.id, paymentRequestId: request.id },
    });
    if (collaborator) {
      await tx.collaboratorPayoutRecord.create({
        data: { collaboratorId: collaborator.id, amount: ctv.amount, month, paidAt: when, paidById: user.id, paymentRequestId: request.id },
      });
    }
    await auditRequired(tx, user.id, "PAY_COMMISSION", {
      entity: "CommissionPayout",
      entityId: payout.id,
      meta: { month, name, amount: ctv.amount, collaboratorId: collaborator?.id ?? null, payoutHistoryRecorded: !!collaborator, moneyRecalculated: false },
    });
  });
  return { ok: true };
}

/** Hoàn tác ghi sổ chi hoa hồng cộng tác viên. */
export async function undoCtvCommission(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.pay");
  const name = String(formData.get("name") ?? "").trim();
  const month = String(formData.get("month") ?? "");
  if (!name || !MONTH_RE.test(month)) return { error: "Thiếu tên cộng tác viên hoặc tháng." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã chốt sổ — mở lại sổ trước khi sửa.` };

  const payout = await prisma.commissionPayout.findUnique({ where: { name_month: { name, month } } });
  if (!payout) return { error: "Khoản hoa hồng này chưa được ghi sổ." };

  await prisma.$transaction(async (tx) => {
    if (payout.paymentRequestId) {
      await tx.collaboratorPayoutRecord.deleteMany({ where: { paymentRequestId: payout.paymentRequestId } });
    }
    await tx.commissionPayout.delete({ where: { id: payout.id } });
    if (payout.cashTxId) {
      const cashTx = await tx.cashTransaction.findUnique({ where: { id: payout.cashTxId }, select: { paymentRequestId: true } });
      await tx.cashTransaction.delete({ where: { id: payout.cashTxId } });
      if (cashTx?.paymentRequestId) await tx.paymentRequest.update({ where: { id: cashTx.paymentRequestId }, data: { status: "CANCELLED", paidAt: null } });
    }
    await auditRequired(tx, user.id, "UNDO_PAY_COMMISSION", { entity: "CommissionPayout", entityId: payout.id, meta: { month, name } });
  });
  return { ok: true };
}

// ============================ CHỐT SỔ / MỞ LẠI SỔ ============================

/**
 * Chốt sổ tháng: chụp lại (snapshot) toàn bộ con số rồi khóa tháng đó — không
 * ai sửa được giao dịch thu chi hay bảng lương của tháng nữa. Đây là bước cuối
 * mỗi tháng để số liệu báo cáo không còn thay đổi về sau.
 */
export async function closePeriod(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.close");
  const month = String(formData.get("month") ?? "");
  if (!MONTH_RE.test(month)) return { error: "Tháng không hợp lệ." };
  if (await isMonthClosed(month)) return { error: `Tháng ${month} đã được chốt sổ trước đó.` };

  const note = String(formData.get("note") ?? "").trim();
  const standardDays = standardDaysOf(formData.get("standardDays"));
  const a = await getMonthlyAccounting(monthDate(month), standardDays);

  await prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.create({
      data: {
        month,
        serviceRevenue: a.pnl.serviceRevenue,
        otherIncome: a.pnl.otherIncome,
        operatingExpense: a.pnl.operatingExpense,
        salaryExpense: a.pnl.salaryExpense,
        ctvCommission: a.pnl.ctvCommission,
        profit: a.pnl.profit,
        note: note || null,
        closedById: user.id,
      },
    });
    await auditRequired(tx, user.id, "CLOSE_PERIOD", {
      entity: "AccountingPeriod",
      entityId: period.id,
      meta: { month, profit: a.pnl.profit, revenue: a.pnl.serviceRevenue },
    });
  });
  return { ok: true };
}

/** Mở lại sổ tháng đã chốt (để sửa số liệu). Ghi nhật ký vì đây là thao tác nhạy cảm. */
export async function reopenPeriod(_prev: AccState, formData: FormData): Promise<AccState> {
  const user = await requireCap("accounting.close");
  const month = String(formData.get("month") ?? "");
  if (!MONTH_RE.test(month)) return { error: "Tháng không hợp lệ." };

  const period = await prisma.accountingPeriod.findUnique({ where: { month } });
  if (!period) return { error: "Tháng này chưa chốt sổ." };

  await prisma.$transaction(async (tx) => {
    await tx.accountingPeriod.delete({ where: { id: period.id } });
    await auditRequired(tx, user.id, "REOPEN_PERIOD", {
      entity: "AccountingPeriod",
      entityId: period.id,
      meta: { month, closedAt: period.closedAt.toISOString() },
    });
  });
  return { ok: true };
}
