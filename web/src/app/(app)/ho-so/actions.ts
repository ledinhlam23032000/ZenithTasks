"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireCap } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toNum } from "@/lib/money";
import { Prisma } from "@/generated/prisma/client";
import { summarizeCase, validatePaymentAmount, validateServicePrice } from "@/lib/financial-summary";
import { canAccessCase, type CaseAccess } from "@/lib/case-access";

export type CaseActionState = { ok?: boolean; error?: string; nonce?: number };

const LOCKED_MSG = "Hồ sơ đã khóa — không thể chỉnh sửa. Vui lòng liên hệ quản trị viên để mở lại.";

/** Hồ sơ đã khóa thì chỉ ADMIN mới được sửa. */
async function isLockedFor(caseId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return false;
  const c = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { locked: true } });
  return !!c?.locked;
}

type RecalcDb = Pick<Prisma.TransactionClient, "caseService" | "payment" | "caseRecord">;

class FinancialActionError extends Error {}

async function caseAccessError(user: Parameters<typeof canAccessCase>[0], caseId: string, access: CaseAccess): Promise<string | null> {
  if (!caseId) return "Thiếu hồ sơ.";
  const record = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { consultantId: true, doctorId: true } });
  return record && canAccessCase(user, record, access) ? null : "Bạn không có quyền thao tác trên hồ sơ này.";
}

/** Tính lại snapshot từ child records trong cùng transaction với mutation. */
async function recalc(caseId: string, db: RecalcDb = prisma): Promise<void> {
  const [services, payments, rec] = await Promise.all([
    db.caseService.findMany({ where: { caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true } }),
    db.payment.findMany({ where: { caseId }, select: { amount: true } }),
    db.caseRecord.findUnique({ where: { id: caseId }, select: { voucherAmount: true } }),
  ]);
  const summary = summarizeCase({ services, payments, voucherAmount: rec?.voucherAmount });
  await db.caseRecord.update({
    where: { id: caseId },
    data: {
      totalAmount: summary.total,
      discountAmount: summary.lineDiscount,
      paidAmount: summary.paid,
      debtAmount: summary.debt,
    },
  });
}

function refresh(caseId: string, customerId?: string) {
  revalidatePath(`/ho-so/${caseId}`);
  revalidatePath("/ho-so");
  revalidatePath("/dashboard");
  revalidatePath("/bao-cao");
  revalidatePath("/khach-hang");
  if (customerId) revalidatePath(`/khach-hang/${customerId}`);
}

// ---- Khóa / mở khóa hồ sơ ----
export async function lockCase(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("caseId") ?? "");
  if (!id) return;
  if (await caseAccessError(user, id, "clinical")) return;
  await prisma.caseRecord.update({
    where: { id },
    data: { locked: true, lockedAt: new Date(), lockedById: user.id },
  });
  refresh(id);
}

export async function unlockCase(formData: FormData): Promise<void> {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("caseId") ?? "");
  if (!id) return;
  await prisma.caseRecord.update({
    where: { id },
    data: { locked: false, lockedAt: null, lockedById: null },
  });
  refresh(id);
}

// ---- Cập nhật thông tin hồ sơ (tư vấn) ----
const infoSchema = z.object({
  caseId: z.string().min(1),
  consultantId: z.string().optional(),
  doctorId: z.string().optional(),
  status: z.enum(["OPEN", "CONSULTED", "SERVICED", "COMPLETED", "CANCELLED"]),
  consultResult: z.enum(["PENDING", "AGREED", "CONSIDERING", "DECLINED"]),
  commissionAmount: z.coerce.number().min(0, "Hoa hồng không hợp lệ.").default(0),
  chiefComplaint: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function updateCaseInfo(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = infoSchema.safeParse({
    caseId,
    consultantId: formData.get("consultantId") ?? "",
    doctorId: formData.get("doctorId") ?? "",
    status: formData.get("status") ?? "OPEN",
    consultResult: formData.get("consultResult") ?? "PENDING",
    commissionAmount: formData.get("commissionAmount") ?? 0,
    chiefComplaint: formData.get("chiefComplaint") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  await prisma.caseRecord.update({
    where: { id: d.caseId },
    data: {
      consultantId: d.consultantId || null,
      doctorId: d.doctorId || null,
      status: d.status,
      consultResult: d.consultResult,
      commissionAmount: d.commissionAmount,
      chiefComplaint: d.chiefComplaint || null,
      note: d.note || null,
      completedAt: d.status === "COMPLETED" ? new Date() : null,
    },
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa NGÀY TẠO hồ sơ (CHỈ quản trị viên) ----
// Dùng khi khách đông, hồ sơ tạo sau ngày khách thực đến. Chỉ ADMIN để tránh gian lận.
export async function updateCaseDate(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const me = await requireUser(["ADMIN"]);
  const caseId = String(formData.get("caseId") ?? "");
  const raw = String(formData.get("createdAt") ?? "").trim();
  if (!caseId) return { error: "Thiếu hồ sơ." };
  if (!raw) return { error: "Vui lòng chọn ngày." };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "Ngày không hợp lệ." };
  if (d.getTime() > Date.now() + 60_000) return { error: "Ngày tạo không thể ở tương lai." };

  await prisma.caseRecord.update({ where: { id: caseId }, data: { createdAt: d } });
  await audit(me.id, "EDIT_CASE_DATE", { entity: "CaseRecord", entityId: caseId, meta: { createdAt: raw } });
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm dịch vụ vào hồ sơ ----
const serviceSchema = z.object({
  caseId: z.string().min(1),
  serviceId: z.string().optional(),
  name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ."),
  listPrice: z.coerce.number().int("Giá phải là số nguyên VND.").min(0).default(0),
  unitPrice: z.coerce.number().int("Đơn giá phải là số nguyên VND.").min(0, "Đơn giá không hợp lệ."),
  quantity: z.coerce.number().int().min(1).default(1),
  discount: z.coerce.number().int("Mức giảm phải là số nguyên VND.").min(0).default(0),
});

export async function addCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = serviceSchema.safeParse({
    caseId,
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name") ?? "",
    listPrice: formData.get("listPrice") ?? 0,
    unitPrice: formData.get("unitPrice") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    discount: formData.get("discount") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const priceValidation = validateServicePrice(d);
  if (!priceValidation.ok) return { error: priceValidation.error };
  const finalPrice = d.unitPrice * d.quantity - d.discount;
  const listPrice = d.listPrice > 0 ? d.listPrice : d.unitPrice; // không có giá gốc → lấy giá ưu đãi

  await prisma.$transaction(async (tx) => {
    const c = await tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { doctorId: true } });
    if (!c) throw new FinancialActionError("Không tìm thấy hồ sơ.");
    await tx.caseService.create({
      data: {
        caseId: d.caseId,
        serviceId: d.serviceId || null,
        name: d.name,
        listPrice,
        unitPrice: d.unitPrice,
        quantity: d.quantity,
        discount: d.discount,
        finalPrice,
        doctorId: c.doctorId ?? null,
      },
    });
    await recalc(d.caseId, tx);
  });
  return { ok: true, nonce: Date.now() };
}

export async function removeCaseService(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (await caseAccessError(user, caseId, "clinical")) return;
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.caseService.deleteMany({ where: { id, caseId } });
    if (deleted.count > 0) await recalc(caseId, tx);
    return deleted.count;
  });
  if (caseId && result > 0) {
    refresh(caseId);
  }
}

// ---- Sửa dịch vụ trong hồ sơ ----
const serviceEditSchema = serviceSchema.extend({ id: z.string().min(1) });

export async function updateCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = serviceEditSchema.safeParse({
    id: formData.get("id") ?? "",
    caseId,
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name") ?? "",
    listPrice: formData.get("listPrice") ?? 0,
    unitPrice: formData.get("unitPrice") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    discount: formData.get("discount") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const priceValidation = validateServicePrice(d);
  if (!priceValidation.ok) return { error: priceValidation.error };
  const finalPrice = d.unitPrice * d.quantity - d.discount;
  const listPrice = d.listPrice > 0 ? d.listPrice : d.unitPrice;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.caseService.updateMany({
      where: { id: d.id, caseId: d.caseId },
      data: { name: d.name, listPrice, unitPrice: d.unitPrice, quantity: d.quantity, discount: d.discount, finalPrice },
    });
    if (updated.count === 0) throw new FinancialActionError("Không tìm thấy dịch vụ thuộc hồ sơ này.");
    await recalc(d.caseId, tx);
    return updated.count;
  });
  if (result === 0) return { error: "Không tìm thấy dịch vụ thuộc hồ sơ này." };
  return { ok: true, nonce: Date.now() };
}

// ---- Voucher giảm thêm (chỉ quản trị / quản lý — ảnh hưởng tiền & hoa hồng) ----
const voucherSchema = z.object({
  caseId: z.string().min(1),
  voucherKind: z.enum(["VND", "PCT"]),
  voucherValue: z.coerce.number().min(0).default(0),
  voucherCode: z.string().trim().optional(),
});

export async function updateCaseVoucher(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.manage");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "payment.manage");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = voucherSchema.safeParse({
    caseId,
    voucherKind: formData.get("voucherKind") ?? "VND",
    voucherValue: formData.get("voucherValue") ?? 0,
    voucherCode: formData.get("voucherCode") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  // Tổng sau ưu đãi từng dịch vụ (trước voucher) — để quy đổi % và kẹp.
  const agg = await prisma.caseService.aggregate({ where: { caseId: d.caseId }, _sum: { finalPrice: true } });
  const subtotal = toNum(agg._sum.finalPrice);

  let amount = d.voucherKind === "PCT" ? Math.round((subtotal * d.voucherValue) / 100) : Math.round(d.voucherValue);
  amount = Math.max(0, Math.min(amount, subtotal));

  const label =
    amount > 0
      ? `${d.voucherCode || "Voucher"}${d.voucherKind === "PCT" ? ` (-${d.voucherValue}%)` : ""}`
      : null;

  await prisma.caseRecord.update({
    where: { id: d.caseId },
    data: { voucherAmount: amount, voucherCode: label },
  });
  await audit(user.id, "APPLY_VOUCHER", { entity: "CaseRecord", entityId: d.caseId, meta: { amount, code: label ?? "" } });
  await recalc(d.caseId);
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm thanh toán ----
const paymentSchema = z.object({
  caseId: z.string().min(1),
  clientNonce: z.string().uuid("Mã giao dịch không hợp lệ."),
  amount: z.coerce.number().int("Số tiền phải là số nguyên VND.").positive("Số tiền phải lớn hơn 0."),
  method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]),
  note: z.string().trim().optional(),
});

export async function addPayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.add");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "payment.add");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = paymentSchema.safeParse({
    caseId,
    clientNonce: formData.get("clientNonce") ?? "",
    amount: formData.get("amount") ?? 0,
    method: formData.get("method") ?? "CASH",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const duplicate = await tx.payment.findUnique({ where: { clientNonce: d.clientNonce }, select: { id: true } });
      if (duplicate) return;
      const [record, services, payments] = await Promise.all([
        tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { voucherAmount: true } }),
        tx.caseService.findMany({ where: { caseId: d.caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true } }),
        tx.payment.findMany({ where: { caseId: d.caseId }, select: { amount: true } }),
      ]);
      if (!record) throw new FinancialActionError("Không tìm thấy hồ sơ.");
      const current = summarizeCase({ services, payments, voucherAmount: record.voucherAmount });
      const validation = validatePaymentAmount({ amount: d.amount, total: current.total, paid: current.paid });
      if (!validation.ok) throw new FinancialActionError(validation.error);
      await tx.payment.create({
        data: { clientNonce: d.clientNonce, caseId: d.caseId, amount: d.amount, method: d.method, note: d.note || null, receivedById: user.id },
      });
      await recalc(d.caseId, tx);
    });
  } catch (error) {
    if (error instanceof FinancialActionError) return { error: error.message };
    throw error;
  }
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa thanh toán (chỉ quản trị / quản lý — liên quan tiền) ----
const paymentEditSchema = paymentSchema.omit({ clientNonce: true }).extend({ id: z.string().min(1) });

export async function updatePayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.manage");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "payment.manage");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = paymentEditSchema.safeParse({
    id: formData.get("id") ?? "",
    caseId,
    amount: formData.get("amount") ?? 0,
    method: formData.get("method") ?? "CASH",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  // Chỉ ADMIN được sửa NGÀY thu tiền (để cập nhật số liệu cũ cho báo cáo trung thực).
  let paidAt: Date | undefined;
  if (user.role === "ADMIN") {
    const raw = String(formData.get("paidAt") ?? "").trim();
    if (raw) {
      const dt = new Date(raw);
      if (!Number.isNaN(dt.getTime())) {
        if (dt.getTime() > Date.now() + 60_000) return { error: "Ngày thu không thể ở tương lai." };
        paidAt = dt;
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [payment, record, services, payments] = await Promise.all([
        tx.payment.findFirst({ where: { id: d.id, caseId: d.caseId }, select: { amount: true } }),
        tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { voucherAmount: true } }),
        tx.caseService.findMany({ where: { caseId: d.caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true } }),
        tx.payment.findMany({ where: { caseId: d.caseId, NOT: { id: d.id } }, select: { amount: true } }),
      ]);
      if (!payment || !record) throw new FinancialActionError("Không tìm thấy khoản thu thuộc hồ sơ này.");
      const current = summarizeCase({ services, payments, voucherAmount: record.voucherAmount });
      const validation = validatePaymentAmount({ amount: d.amount, total: current.total, paid: current.paid });
      if (!validation.ok) throw new FinancialActionError(validation.error);
      await tx.payment.update({
        where: { id: d.id },
        data: { amount: d.amount, method: d.method, note: d.note || null, ...(paidAt ? { paidAt } : {}) },
      });
      await recalc(d.caseId, tx);
    });
  } catch (error) {
    if (error instanceof FinancialActionError) return { error: error.message };
    throw error;
  }
  await audit(user.id, "UPDATE_PAYMENT", { entity: "Payment", entityId: d.id, meta: { amount: d.amount, paidAt: paidAt?.toISOString() } });
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm vật tư đã dùng ----
const materialSchema = z.object({
  caseId: z.string().min(1),
  materialId: z.string().optional(),
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư."),
  unit: z.string().trim().default("cái"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0.").default(1),
  note: z.string().trim().optional(),
});

export async function addMaterial(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = materialSchema.safeParse({
    caseId,
    materialId: formData.get("materialId") ?? "",
    name: formData.get("name") ?? "",
    unit: formData.get("unit") ?? "cái",
    quantity: formData.get("quantity") ?? 1,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  await prisma.materialUsage.create({
    data: {
      caseId: d.caseId,
      materialId: d.materialId || null,
      name: d.name,
      unit: d.unit,
      quantity: d.quantity,
      note: d.note || null,
      performedById: user.id,
    },
  });
  // Xuất kho: trừ tồn + ghi nhật ký (nếu vật tư có trong danh mục kho).
  if (d.materialId) {
    await prisma.material
      .update({ where: { id: d.materialId }, data: { stock: { decrement: d.quantity } } })
      .catch(() => {});
    await prisma.stockMovement
      .create({ data: { materialId: d.materialId, type: "OUT", quantity: d.quantity, note: "Dùng cho hồ sơ", createdById: user.id } })
      .catch(() => {});
  }
  return { ok: true, nonce: Date.now() };
}

export async function removeMaterial(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (await caseAccessError(user, caseId, "clinical")) return;
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const usage = await prisma.materialUsage.findFirst({ where: { id, caseId }, select: { materialId: true, quantity: true } });
  if (!usage) return;
  await prisma.materialUsage.deleteMany({ where: { id, caseId } });
  // Hoàn kho lại nếu vật tư thuộc danh mục kho.
  if (usage?.materialId) {
    const q = toNum(usage.quantity);
    await prisma.material.update({ where: { id: usage.materialId }, data: { stock: { increment: q } } }).catch(() => {});
    await prisma.stockMovement
      .create({ data: { materialId: usage.materialId, type: "IN", quantity: q, note: "Hoàn kho (xóa vật tư)", createdById: user.id } })
      .catch(() => {});
  }
  if (caseId) refresh(caseId);
}

// ---- Sửa vật tư trong hồ sơ (điều chỉnh tồn kho theo chênh lệch số lượng) ----
const materialEditSchema = materialSchema.extend({ id: z.string().min(1) });

export async function updateMaterialUsage(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = materialEditSchema.safeParse({
    id: formData.get("id") ?? "",
    caseId,
    materialId: formData.get("materialId") ?? "",
    name: formData.get("name") ?? "",
    unit: formData.get("unit") ?? "cái",
    quantity: formData.get("quantity") ?? 1,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const existing = await prisma.materialUsage.findUnique({
    where: { id: d.id },
    select: { materialId: true, quantity: true },
  });
  if (!existing) return { error: "Không tìm thấy vật tư thuộc hồ sơ này." };
  const existingCase = await prisma.materialUsage.findFirst({ where: { id: d.id, caseId }, select: { id: true } });
  if (!existingCase) return { error: "Không tìm thấy vật tư thuộc hồ sơ này." };

  await prisma.materialUsage.update({
    where: { id: d.id },
    data: { name: d.name, unit: d.unit, quantity: d.quantity, note: d.note || null },
  });

  // Điều chỉnh tồn kho theo chênh lệch (dương = dùng thêm → trừ kho; âm = trả lại kho).
  if (existing?.materialId) {
    const delta = d.quantity - toNum(existing.quantity);
    if (delta !== 0) {
      await prisma.material
        .update({ where: { id: existing.materialId }, data: { stock: { decrement: delta } } })
        .catch(() => {});
      await prisma.stockMovement
        .create({
          data: {
            materialId: existing.materialId,
            type: delta > 0 ? "OUT" : "IN",
            quantity: Math.abs(delta),
            note: "Điều chỉnh vật tư (sửa hồ sơ)",
            createdById: user.id,
          },
        })
        .catch(() => {});
    }
  }
  return { ok: true, nonce: Date.now() };
}

// ---- Tải ảnh trước / sau / tái khám ----
// KHÔNG nhận SVG (có thể chứa mã độc) — chỉ ảnh bitmap an toàn.
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadPhoto(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };
  const type = String(formData.get("type") ?? "BEFORE");
  const caption = String(formData.get("caption") ?? "").trim();
  const followUpIndex = Number(formData.get("followUpIndex") ?? 0) || null;
  const file = formData.get("file");

  if (!caseId || !customerId) return { error: "Thiếu thông tin hồ sơ." };
  const caseCustomer = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { customerId: true } });
  if (!caseCustomer || caseCustomer.customerId !== customerId) return { error: "Khách hàng không thuộc hồ sơ này." };
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn ảnh." };
  if (file.size > 8 * 1024 * 1024) return { error: "Ảnh tối đa 8MB." };
  // Bắt buộc đúng định dạng ảnh (không cho phép thiếu/giả mạo kiểu tệp).
  if (!ALLOWED_IMG.includes(file.type)) return { error: "Định dạng ảnh không hỗ trợ (chỉ JPG, PNG, WEBP, HEIC)." };
  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

  const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = ALLOWED_EXT.includes(rawExt) ? rawExt : "jpg";
  const fname = `${caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()));

  await prisma.photo.create({
    data: {
      customerId,
      caseId,
      type: type as "BEFORE" | "AFTER" | "FOLLOW_UP" | "CLINICAL",
      url: `/media/${fname}`,
      caption: caption || null,
      followUpIndex,
      uploadedById: user.id,
    },
  });
  return { ok: true, nonce: Date.now() };
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (await caseAccessError(user, caseId, "clinical")) return;
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.photo.deleteMany({ where: { id, caseId } });
  if (caseId) refresh(caseId);
}

// ---- Hẹn tái khám ----
const followSchema = z.object({
  caseId: z.string().min(1),
  customerId: z.string().min(1),
  scheduledAt: z.string().min(1, "Chọn ngày tái khám."),
  note: z.string().trim().optional(),
});

export async function addFollowUp(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const accessError = await caseAccessError(user, caseId, "clinical");
  if (accessError) return { error: accessError };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = followSchema.safeParse({
    caseId,
    customerId: formData.get("customerId") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const when = new Date(d.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày tái khám không hợp lệ." };
  const caseCustomer = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { customerId: true } });
  if (!caseCustomer || caseCustomer.customerId !== d.customerId) return { error: "Khách hàng không thuộc hồ sơ này." };

  await prisma.followUp.create({
    data: { caseId: d.caseId, customerId: d.customerId, scheduledAt: when, note: d.note || null, createdById: user.id },
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Xóa thanh toán (quản trị / quản lý) ----
export async function deletePayment(formData: FormData): Promise<void> {
  const user = await requireCap("payment.manage");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (await caseAccessError(user, caseId, "payment.manage")) return;
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const pay = await prisma.payment.findFirst({ where: { id, caseId }, select: { amount: true } });
  if (!pay) return;
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.payment.deleteMany({ where: { id, caseId } });
    if (deleted.count > 0) await recalc(caseId, tx);
  });
  await audit(user.id, "DELETE_PAYMENT", { entity: "Payment", entityId: id, meta: { amount: toNum(pay?.amount), caseId } });
  if (caseId) {
    refresh(caseId);
  }
}

// ---- Xóa lịch tái khám ----
export async function deleteFollowUp(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (await caseAccessError(user, caseId, "clinical")) return;
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.followUp.deleteMany({ where: { id, caseId } });
  if (caseId) refresh(caseId);
}

// ---- Xóa cả hồ sơ điều trị (CHỈ quản trị viên) ----
export async function deleteCase(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const rec = await prisma.caseRecord.findUnique({ where: { id }, select: { customerId: true } });
  // Dịch vụ/thanh toán/vật tư/tái khám tự xóa theo (onDelete: Cascade); ảnh giữ lại cho khách.
  await prisma.photo.updateMany({ where: { caseId: id }, data: { caseId: null } });
  await prisma.caseRecord.delete({ where: { id } });
  await audit(user.id, "DELETE_CASE", { entity: "CaseRecord", entityId: id });
  if (rec?.customerId) revalidatePath(`/khach-hang/${rec.customerId}`);
  revalidatePath("/ho-so");
  revalidatePath("/dashboard");
  redirect(rec?.customerId ? `/khach-hang/${rec.customerId}` : "/ho-so");
}
