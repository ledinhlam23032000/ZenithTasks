"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap, requireUser } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { isMonthClosed } from "@/lib/accounting";
import { paymentRequestNo, paymentRequestTransitionError } from "@/lib/payment-request";
import type { Prisma, PaymentMethod } from "@/generated/prisma/client";

export type PaymentRequestState = { ok?: boolean; error?: string; id?: string };

const MONTH_RE = /^\d{4}-\d{2}$/;
const requestSchema = z.object({
  type: z.enum(["EXPENSE", "SALARY", "COLLABORATOR", "STAFF_OTHER"]),
  payeeName: z.string().trim().min(1).max(200),
  payeeUserId: z.string().trim().optional(),
  amount: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(1000),
  month: z.string().regex(MONTH_RE).optional(),
  category: z.string().trim().max(50).optional(),
  note: z.string().trim().max(1000).optional(),
});

const methods = new Set(["CASH", "CARD", "TRANSFER", "EWALLET"]);

const printOverrideSchema = z.object({
  recipient: z.string().trim().min(1).max(300),
  requesterName: z.string().trim().min(1).max(200),
  requesterAddress: z.string().trim().min(1).max(300),
  reason: z.string().trim().min(3).max(1000),
  location: z.string().trim().min(1).max(100),
});

function parseDate(raw: FormDataEntryValue | null): Date {
  const parsed = new Date(String(raw ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function createPaymentRequest(_prev: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireCap("accounting.pay");
  const parsed = requestSchema.safeParse({
    type: formData.get("type"),
    payeeName: formData.get("payeeName"),
    payeeUserId: formData.get("payeeUserId") || undefined,
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    month: formData.get("month") || undefined,
    category: formData.get("category") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin đề nghị thanh toán chưa hợp lệ." };
  if (parsed.data.month && await isMonthClosed(parsed.data.month)) return { error: `Tháng ${parsed.data.month} đã chốt sổ; không tạo chứng từ mới cho tháng này.` };

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentRequest.create({
      data: {
        requestNo: paymentRequestNo(),
        type: parsed.data.type,
        status: "PENDING",
        requesterId: user.id,
        payeeUserId: parsed.data.payeeUserId || null,
        payeeName: parsed.data.payeeName,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        month: parsed.data.month || null,
        details: {
          category: parsed.data.category || "OTHER_EXP",
          note: parsed.data.note || null,
        } satisfies Prisma.InputJsonValue,
      },
    });
    await auditRequired(tx, user.id, "CREATE_PAYMENT_REQUEST", { entity: "PaymentRequest", entityId: created.id, meta: { requestNo: created.requestNo, amount: parsed.data.amount } });
    return created;
  });
  return { ok: true, id: request.id };
}

export async function updatePaymentRequestPrintOverrides(_prev: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã chứng từ." };
  const parsed = printOverrideSchema.safeParse({
    recipient: formData.get("recipient"),
    requesterName: formData.get("requesterName"),
    requesterAddress: formData.get("requesterAddress"),
    reason: formData.get("reason"),
    location: formData.get("location"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nội dung phiếu chưa hợp lệ." };

  const request = await prisma.paymentRequest.findUnique({ where: { id }, select: { id: true, status: true, details: true, amount: true } });
  if (!request) return { error: "Không tìm thấy chứng từ." };
  const details = (request.details && typeof request.details === "object" && !Array.isArray(request.details) ? request.details : {}) as Record<string, unknown>;
  const previousOverrides = (details.printOverrides && typeof details.printOverrides === "object" && !Array.isArray(details.printOverrides) ? details.printOverrides : {}) as Record<string, unknown>;
  const nextDetails = {
    ...details,
    printOverrides: {
      ...previousOverrides,
      ...parsed.data,
      editedAt: new Date().toISOString(),
      editedById: user.id,
    },
  } satisfies Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({ where: { id }, data: { details: nextDetails } });
    await auditRequired(tx, user.id, "EDIT_PAYMENT_REQUEST_PRINT", {
      entity: "PaymentRequest",
      entityId: id,
      meta: { status: request.status, amount: request.amount, fields: Object.keys(parsed.data) },
    });
  });
  return { ok: true };
}

export async function approvePaymentRequest(_prev: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã chứng từ." };
  const request = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!request) return { error: "Không tìm thấy chứng từ." };
  const transitionError = paymentRequestTransitionError(request.status, "APPROVED");
  if (transitionError) return { error: transitionError };
  if (request.month && await isMonthClosed(request.month)) return { error: `Tháng ${request.month} đã chốt sổ.` };
  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({ where: { id }, data: { status: "APPROVED", approverId: user.id, approvedAt: new Date(), rejectedAt: null, rejectionReason: null } });
    await auditRequired(tx, user.id, "APPROVE_PAYMENT_REQUEST", { entity: "PaymentRequest", entityId: id, meta: { amount: request.amount } });
  });
  return { ok: true };
}

export async function rejectPaymentRequest(_prev: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || reason.length < 3) return { error: "Cần mã chứng từ và lý do từ chối." };
  const request = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!request) return { error: "Không tìm thấy chứng từ." };
  const transitionError = paymentRequestTransitionError(request.status, "REJECTED");
  if (transitionError) return { error: transitionError };
  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({ where: { id }, data: { status: "REJECTED", approverId: user.id, rejectedAt: new Date(), rejectionReason: reason } });
    await auditRequired(tx, user.id, "REJECT_PAYMENT_REQUEST", { entity: "PaymentRequest", entityId: id, meta: { reason } });
  });
  return { ok: true };
}

export async function markPaymentRequestPaid(_prev: PaymentRequestState, formData: FormData): Promise<PaymentRequestState> {
  const user = await requireCap("accounting.pay");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã chứng từ." };
  const request = await prisma.paymentRequest.findUnique({
    where: { id },
    include: { cashTransaction: { select: { id: true, occurredAt: true, method: true, amount: true } } },
  });
  if (!request) return { error: "Không tìm thấy chứng từ." };
  const transitionError = paymentRequestTransitionError(request.status, "PAID");
  if (transitionError) return { error: transitionError };
  if (request.month && await isMonthClosed(request.month)) return { error: `Tháng ${request.month} đã chốt sổ.` };
  const rawMethod = String(formData.get("method") ?? "TRANSFER");
  const method = (methods.has(rawMethod) ? rawMethod : "TRANSFER") as PaymentMethod;
  const occurredAt = parseDate(formData.get("occurredAt"));
  if (request.cashTransaction) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({ where: { id: request.id }, data: { status: "PAID", paidAt: new Date() } });
      await auditRequired(tx, user.id, "PAY_PAYMENT_REQUEST", {
        entity: "PaymentRequest",
        entityId: request.id,
        meta: { cashTxId: request.cashTransaction?.id, amount: request.amount, source: "THU_CHI", reusedExistingCashTransaction: true },
      });
    });
    return { ok: true };
  }
  const details = (request.details && typeof request.details === "object" && !Array.isArray(request.details) ? request.details : {}) as Record<string, unknown>;
  const category = typeof details.category === "string" ? details.category : "OTHER_EXP";

  await prisma.$transaction(async (tx) => {
    const cashTx = await tx.cashTransaction.create({
      data: {
        type: "EXPENSE",
        category,
        amount: request.amount,
        occurredAt,
        method,
        vendor: request.payeeName,
        note: request.reason,
        createdById: user.id,
        paymentRequestId: request.id,
      },
    });
    await tx.paymentRequest.update({ where: { id: request.id }, data: { status: "PAID", paidAt: new Date() } });
    await auditRequired(tx, user.id, "PAY_PAYMENT_REQUEST", { entity: "PaymentRequest", entityId: request.id, meta: { cashTxId: cashTx.id, amount: request.amount } });
  });
  return { ok: true };
}
