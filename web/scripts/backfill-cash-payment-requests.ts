import { format } from "date-fns";
import { prisma } from "../src/lib/db";
import { CATEGORY_LABEL } from "../src/lib/finance";
import { PAYMENT_REQUEST_DEFAULT_RECIPIENT } from "../src/lib/payment-request";
import { auditRequired } from "../src/lib/audit";

function legacyRequestNo(cashId: string, occurredAt: Date) {
  const date = format(occurredAt, "yyyyMMdd");
  return `DNT-${date}-LEGACY-${cashId.slice(-8).toUpperCase()}`;
}

function legacyPaymentType(category: string): "EXPENSE" | "SALARY" | "COLLABORATOR" {
  if (category === "SALARY") return "SALARY";
  if (category === "COMMISSION") return "COLLABORATOR";
  return "EXPENSE";
}

function legacyReason(category: string, vendor: string | null, note: string | null) {
  if (note) return note;
  if (category === "SALARY") return `Chi ${CATEGORY_LABEL[category] ?? "lương nhân viên"}${vendor ? ` cho ${vendor}` : ""}`;
  if (category === "COMMISSION") return `Chi ${CATEGORY_LABEL[category] ?? "hoa hồng cộng tác viên"}${vendor ? ` cho ${vendor}` : ""}`;
  return `Mua ${CATEGORY_LABEL[category] ?? category}${vendor ? ` tại ${vendor}` : ""}`;
}

async function main() {
  const fallbackRequester = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true },
  }) ?? await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true },
  });

  if (!fallbackRequester) {
    console.log("[backfill] Chưa có tài khoản người dùng; bỏ qua, lần khởi động sau sẽ thử lại.");
    return;
  }

  const legacyRows = await prisma.cashTransaction.findMany({
    where: { type: "EXPENSE", paymentRequestId: null },
    orderBy: { occurredAt: "asc" },
    select: {
      id: true,
      category: true,
      amount: true,
      occurredAt: true,
      method: true,
      vendor: true,
      note: true,
      createdById: true,
      createdAt: true,
      payrollEntry: { select: { paymentRequestId: true } },
      commissionPayout: { select: { paymentRequestId: true } },
    },
  });

  const indirectLinks = legacyRows.filter((row) => row.payrollEntry?.paymentRequestId || row.commissionPayout?.paymentRequestId);
  let linkedExisting = 0;
  for (const row of indirectLinks) {
    const paymentRequestId = row.payrollEntry?.paymentRequestId ?? row.commissionPayout?.paymentRequestId;
    if (!paymentRequestId) continue;
    const didLink = await prisma.$transaction(async (tx) => {
      const current = await tx.cashTransaction.findUnique({ where: { id: row.id }, select: { paymentRequestId: true } });
      if (!current || current.paymentRequestId) return false;
      await tx.cashTransaction.update({ where: { id: row.id }, data: { paymentRequestId } });
      await auditRequired(tx, fallbackRequester.id, "BACKFILL_PAYMENT_REQUEST_LINK", {
        entity: "CashTransaction",
        entityId: row.id,
        meta: { paymentRequestId, source: row.payrollEntry?.paymentRequestId ? "PAYROLL" : "COMMISSION" },
      });
      return true;
    });
    if (didLink) linkedExisting++;
  }

  const candidates = legacyRows.filter((row) => !row.payrollEntry?.paymentRequestId && !row.commissionPayout?.paymentRequestId);
  if (candidates.length === 0) {
    console.log(`[backfill] Đã nối ${linkedExisting} phiếu liên quan có sẵn; không còn khoản Chi lịch sử thiếu chứng từ.`);
    return;
  }

  let linked = 0;
  for (const row of candidates) {
    const requesterId = row.createdById ?? fallbackRequester.id;
    const requestNo = legacyRequestNo(row.id, row.occurredAt);
    const reason = legacyReason(row.category, row.vendor, row.note);
    const details = {
      category: row.category,
      note: row.note || reason,
      source: "THU_CHI",
      occurredAt: row.occurredAt.toISOString(),
      method: row.method,
      vendor: row.vendor,
      backfilled: true,
      originalCashTransactionId: row.id,
      requesterFallback: row.createdById === null,
    };

    const wasLinked = await prisma.$transaction(async (tx) => {
      const current = await tx.cashTransaction.findUnique({
        where: { id: row.id },
        select: { paymentRequestId: true },
      });
      if (!current || current.paymentRequestId) return false;

      const request = await tx.paymentRequest.upsert({
        where: { requestNo },
        create: {
          requestNo,
          type: legacyPaymentType(row.category),
          status: "PAID",
          requesterId,
          payeeName: row.vendor || "Nhà cung cấp",
          amount: row.amount,
          reason,
          details: { ...details, recipient: PAYMENT_REQUEST_DEFAULT_RECIPIENT },
          month: format(row.occurredAt, "yyyy-MM"),
          requestedAt: row.occurredAt,
          paidAt: row.occurredAt,
        },
        update: {
          status: "PAID",
          requesterId,
          payeeName: row.vendor || "Nhà cung cấp",
          amount: row.amount,
          reason,
          details: { ...details, recipient: PAYMENT_REQUEST_DEFAULT_RECIPIENT },
          month: format(row.occurredAt, "yyyy-MM"),
          paidAt: row.occurredAt,
        },
      });

      await tx.cashTransaction.update({
        where: { id: row.id },
        data: { paymentRequestId: request.id },
      });
      await auditRequired(tx, fallbackRequester.id, "BACKFILL_PAYMENT_REQUEST_FROM_CASHBOOK", {
        entity: "CashTransaction",
        entityId: row.id,
        meta: { paymentRequestId: request.id, requestNo, source: "THU_CHI_LEGACY", requesterFallback: row.createdById === null },
      });
      return true;
    });

    if (wasLinked) linked++;
  }

  console.log(`[backfill] Đã nối ${linkedExisting} phiếu có sẵn và bổ sung ${linked}/${candidates.length} khoản Chi lịch sử với Giấy đề nghị thanh toán.`);
}

main().catch((error) => {
  console.error("[backfill] Không hoàn tất backfill; ứng dụng vẫn khởi động và sẽ thử lại lần sau.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
