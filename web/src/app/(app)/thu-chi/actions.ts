"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { CATEGORY_LABEL } from "@/lib/finance";
import { isMonthClosed } from "@/lib/accounting";
import { auditRequired } from "@/lib/audit";
import { buildCashbookPaymentRequestDetails, linkedCashTransactionGuard, paymentRequestNo, PAYMENT_REQUEST_DEFAULT_RECIPIENT } from "@/lib/payment-request";

export type CashState = { ok?: boolean; error?: string; requestId?: string; message?: string };

const NO_WRITE = "Bạn chỉ có quyền xem sổ thu chi.";

/** Thông báo khi tháng đã được kế toán chốt sổ (mở lại ở trang Kế toán). */
function closedMsg(d: Date) {
  return `Tháng ${format(d, "MM/yyyy")} đã chốt sổ nên không sửa được. Vào trang Kế toán để mở lại sổ nếu cần.`;
}

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Vui lòng chọn hạng mục.").refine((c) => c in CATEGORY_LABEL, "Hạng mục không hợp lệ."),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
  occurredAt: z.string().min(1, "Vui lòng chọn ngày."),
  method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]).default("CASH"),
  vendor: z.string().trim().optional(),
  note: z.string().trim().optional(),
  createPaymentRequest: z.boolean().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    type: formData.get("type") ?? "EXPENSE",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? 0,
    occurredAt: formData.get("occurredAt") ?? "",
    method: formData.get("method") ?? "CASH",
    vendor: formData.get("vendor") ?? "",
    note: formData.get("note") ?? "",
    createPaymentRequest: formData.get("createPaymentRequest") === "on",
  });
}

export async function createCashTransaction(_prev: CashState, formData: FormData): Promise<CashState> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return { error: NO_WRITE };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const when = new Date(d.occurredAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày không hợp lệ." };
  if (await isMonthClosed(format(when, "yyyy-MM"))) return { error: closedMsg(when) };

  const result = await prisma.$transaction(async (tx) => {
    let requestId: string | undefined;
    let requestNo: string | undefined;
    if (d.type === "EXPENSE") {
      const reason = d.note || `Mua ${CATEGORY_LABEL[d.category] ?? d.category}${d.vendor ? ` tại ${d.vendor}` : ""}`;
      const request = await tx.paymentRequest.create({
        data: {
          requestNo: paymentRequestNo(),
          type: "EXPENSE",
          status: "PENDING",
          requesterId: user.id,
          payeeName: d.vendor || "Nhà cung cấp",
          amount: Math.round(d.amount),
          reason,
          month: format(when, "yyyy-MM"),
          details: {
            ...buildCashbookPaymentRequestDetails({ category: d.category, note: d.note || reason, occurredAt: when, method: d.method, vendor: d.vendor }),
            recipient: PAYMENT_REQUEST_DEFAULT_RECIPIENT,
          },
        },
      });
      requestId = request.id;
      requestNo = request.requestNo;
      await auditRequired(tx, user.id, "CREATE_PAYMENT_REQUEST_FROM_CASHBOOK", {
        entity: "PaymentRequest",
        entityId: request.id,
        meta: { requestNo: request.requestNo, amount: Math.round(d.amount), category: d.category, source: "THU_CHI" },
      });

      const cash = await tx.cashTransaction.create({
        data: {
          type: d.type,
          category: d.category,
          amount: Math.round(d.amount),
          occurredAt: when,
          method: d.method,
          vendor: d.vendor || null,
          note: d.note || null,
          createdById: user.id,
          paymentRequestId: request.id,
        },
      });
      await auditRequired(tx, user.id, "CREATE_CASH_TRANSACTION_WITH_PAYMENT_REQUEST", {
        entity: "CashTransaction",
        entityId: cash.id,
        meta: { type: d.type, category: d.category, amount: Math.round(d.amount), occurredAt: when.toISOString(), requestId: request.id },
      });
      return { requestId, requestNo };
    }

    const cash = await tx.cashTransaction.create({
      data: {
        type: d.type,
        category: d.category,
        amount: Math.round(d.amount),
        occurredAt: when,
        method: d.method,
        vendor: d.vendor || null,
        note: d.note || null,
        createdById: user.id,
      },
    });
    await auditRequired(tx, user.id, "CREATE_CASH_TRANSACTION", {
      entity: "CashTransaction",
      entityId: cash.id,
      meta: { type: d.type, category: d.category, amount: Math.round(d.amount), occurredAt: when.toISOString() },
    });
    return { requestId: undefined, requestNo: undefined };
  });
  return result.requestId
    ? { ok: true, requestId: result.requestId, message: `Đã ghi sổ và tạo ${result.requestNo}. Mở chứng từ để xem hoặc in ký.` }
    : { ok: true };
}

export async function updateCashTransaction(_prev: CashState, formData: FormData): Promise<CashState> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return { error: NO_WRITE };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã giao dịch." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const when = new Date(d.occurredAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày không hợp lệ." };

  const current = await prisma.cashTransaction.findUnique({
    where: { id },
    select: { occurredAt: true, paymentRequestId: true, paymentRequest: { select: { status: true } } },
  });
  if (!current) return { error: "Không tìm thấy giao dịch." };
  if (current.paymentRequestId && d.type !== "EXPENSE") return { error: "Giao dịch đã gắn Giấy đề nghị thanh toán nên vẫn phải là khoản Chi." };
  const lockedByRequest = current.paymentRequest?.status === "APPROVED" || current.paymentRequest?.status === "PAID";
  const editGuard = lockedByRequest ? linkedCashTransactionGuard(current.paymentRequestId, "edit") : null;
  if (editGuard) return { error: editGuard };
  // Chặn cả tháng CŨ lẫn tháng MỚI: không được rút giao dịch ra khỏi / đẩy vào một tháng đã chốt.
  if (await isMonthClosed(format(current.occurredAt, "yyyy-MM"))) return { error: closedMsg(current.occurredAt) };
  if (await isMonthClosed(format(when, "yyyy-MM"))) return { error: closedMsg(when) };

  await prisma.$transaction(async (tx) => {
    await tx.cashTransaction.update({
      where: { id },
      data: {
        type: d.type,
        category: d.category,
        amount: Math.round(d.amount),
        occurredAt: when,
        method: d.method,
        vendor: d.vendor || null,
        note: d.note || null,
      },
    });
    if (current.paymentRequestId) {
      const reason = d.note || `Mua ${CATEGORY_LABEL[d.category] ?? d.category}${d.vendor ? ` tại ${d.vendor}` : ""}`;
      await tx.paymentRequest.update({
        where: { id: current.paymentRequestId },
        data: {
          status: current.paymentRequest?.status === "REJECTED" ? "PENDING" : undefined,
          approverId: current.paymentRequest?.status === "REJECTED" ? null : undefined,
          approvedAt: current.paymentRequest?.status === "REJECTED" ? null : undefined,
          rejectedAt: current.paymentRequest?.status === "REJECTED" ? null : undefined,
          rejectionReason: current.paymentRequest?.status === "REJECTED" ? null : undefined,
          payeeName: d.vendor || "Nhà cung cấp",
          amount: Math.round(d.amount),
          reason,
          month: format(when, "yyyy-MM"),
          details: {
            ...buildCashbookPaymentRequestDetails({ category: d.category, note: d.note || reason, occurredAt: when, method: d.method, vendor: d.vendor }),
            recipient: PAYMENT_REQUEST_DEFAULT_RECIPIENT,
          },
        },
      });
    }
    await auditRequired(tx, user.id, "UPDATE_CASH_TRANSACTION", {
      entity: "CashTransaction",
      entityId: id,
      meta: { type: d.type, category: d.category, amount: Math.round(d.amount), occurredAt: when.toISOString() },
    });
  });
  return { ok: true };
}

export async function deleteCashTransaction(formData: FormData): Promise<void> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const cash = await prisma.cashTransaction.findUnique({ where: { id }, select: { occurredAt: true, amount: true, type: true, category: true, paymentRequestId: true } });
  if (!cash) return;
  const deleteGuard = linkedCashTransactionGuard(cash.paymentRequestId, "delete");
  if (deleteGuard) throw new Error(deleteGuard);
  if (await isMonthClosed(format(cash.occurredAt, "yyyy-MM"))) return;

  // Nếu đây là phiếu chi lương / hoa hồng do trang Kế toán sinh ra thì bỏ luôn
  // đánh dấu "đã chi" để bảng lương không lệch với sổ quỹ.
  await prisma.$transaction(async (db) => {
    await db.payrollEntry.updateMany({
      where: { cashTxId: id },
      data: { paidAmount: 0, paidAt: null, cashTxId: null },
    });
    await db.commissionPayout.deleteMany({ where: { cashTxId: id } });
    await db.cashTransaction.delete({ where: { id } });
    await auditRequired(db, user.id, "DELETE_CASH_TRANSACTION", {
      entity: "CashTransaction",
      entityId: id,
      meta: { type: cash.type, category: cash.category, amount: cash.amount },
    });
  });
  revalidatePath("/thu-chi");
  revalidatePath("/dashboard");
  revalidatePath("/ke-toan");
}
