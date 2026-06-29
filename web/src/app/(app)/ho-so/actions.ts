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
import { computeCaseTotals } from "@/lib/case-math";
import { bomNeeds, type BomLine } from "@/lib/service-bom";
import type { Prisma } from "@/generated/prisma/client";

// Client dùng được cho cả prisma thường lẫn trong $transaction.
type Db = Prisma.TransactionClient | typeof prisma;

export type CaseActionState = { ok?: boolean; error?: string; nonce?: number };

const LOCKED_MSG = "Hồ sơ đã khóa — không thể chỉnh sửa. Vui lòng liên hệ quản trị viên để mở lại.";

/** Hồ sơ đã khóa thì chỉ ADMIN mới được sửa. */
async function isLockedFor(caseId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return false;
  const c = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { locked: true } });
  return !!c?.locked;
}

/**
 * Tính lại tổng tiền / đã trả / công nợ cho hồ sơ (hoa hồng nhập tay, không tự tính).
 * Toán đặt ở `lib/case-math.ts` (thuần, có test). Nhận `db` để chạy trong $transaction.
 */
async function recalc(caseId: string, db: Db = prisma): Promise<void> {
  const [services, payAgg, rec] = await Promise.all([
    db.caseService.findMany({ where: { caseId }, select: { finalPrice: true, discount: true } }),
    db.payment.aggregate({ where: { caseId }, _sum: { amount: true } }),
    db.caseRecord.findUnique({ where: { id: caseId }, select: { voucherAmount: true } }),
  ]);
  const totals = computeCaseTotals({
    finalPrices: services.map((x) => toNum(x.finalPrice)),
    discounts: services.map((x) => toNum(x.discount)),
    voucherAmount: toNum(rec?.voucherAmount),
    payments: [toNum(payAgg._sum.amount)],
  });
  await db.caseRecord.update({
    where: { id: caseId },
    data: { totalAmount: totals.total, discountAmount: totals.discount, paidAmount: totals.paid, debtAmount: totals.debt },
  });
}

/**
 * Chạy thao tác ĐỘNG TỚI TIỀN trong 1 giao dịch + KHOÁ hàng hồ sơ (SELECT … FOR UPDATE)
 * để hai người thu/sửa cùng lúc trên 1 hồ sơ không ghi đè số liệu của nhau.
 */
async function withCaseLock<T>(caseId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CaseRecord" WHERE id = ${caseId} FOR UPDATE`;
    return fn(tx);
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
  listPrice: z.coerce.number().min(0).default(0),
  unitPrice: z.coerce.number().min(0, "Đơn giá không hợp lệ."),
  quantity: z.coerce.number().int().min(1).default(1),
  discount: z.coerce.number().min(0).default(0),
});

export async function addCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
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
  const finalPrice = Math.max(d.unitPrice * d.quantity - d.discount, 0);
  const listPrice = d.listPrice > 0 ? d.listPrice : d.unitPrice; // không có giá gốc → lấy giá ưu đãi

  const c = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { doctorId: true } });
  await withCaseLock(d.caseId, async (tx) => {
    const created = await tx.caseService.create({
      data: {
        caseId: d.caseId,
        serviceId: d.serviceId || null,
        name: d.name,
        listPrice,
        unitPrice: d.unitPrice,
        quantity: d.quantity,
        discount: d.discount,
        finalPrice,
        doctorId: c?.doctorId ?? null,
      },
    });
    // TỰ ĐỘNG trừ kho theo định mức (BOM) nếu dịch vụ có khai báo định mức vật tư.
    // (Trước đây phải bấm nút "Trừ VT" thủ công.) Dịch vụ không có định mức → bỏ qua.
    if (created.serviceId) {
      await applyBomTx(tx, { caseServiceId: created.id, caseId: d.caseId, serviceId: created.serviceId, quantity: created.quantity, userId: user.id });
    }
    await recalc(d.caseId, tx);
  });
  return { ok: true, nonce: Date.now() };
}

// Trừ vật tư theo ĐỊNH MỨC (BOM) của 1 dòng dịch vụ, trong 1 giao dịch `tx`.
// No-op nếu dịch vụ chưa khai báo định mức. Đánh dấu bomApplied để chống trừ 2 lần.
async function applyBomTx(
  tx: Prisma.TransactionClient,
  opts: { caseServiceId: string; caseId: string; serviceId: string; quantity: number; userId: string },
): Promise<void> {
  const bom = await tx.serviceMaterial.findMany({
    where: { serviceId: opts.serviceId },
    include: { material: { select: { name: true, unit: true, stock: true, avgCost: true } } },
  });
  if (bom.length === 0) return;
  const lines: BomLine[] = bom.map((b) => ({
    materialId: b.materialId,
    name: b.material.name,
    unit: b.material.unit,
    bomQty: toNum(b.quantity),
    stock: toNum(b.material.stock),
    avgCost: toNum(b.material.avgCost),
  }));
  const needs = bomNeeds(lines, opts.quantity);
  for (const n of needs) {
    const outUnitCost = n.avgCost > 0 ? n.avgCost : null; // giá vốn bình quân → COGS
    await tx.materialUsage.create({
      data: { caseId: opts.caseId, materialId: n.materialId, name: n.name, unit: n.unit, quantity: n.need, note: "Theo định mức dịch vụ", performedById: opts.userId },
    });
    await tx.material.update({ where: { id: n.materialId }, data: { stock: { decrement: n.need } } });
    await tx.stockMovement.create({
      data: { materialId: n.materialId, type: "OUT", quantity: n.need, unitCost: outUnitCost, note: "Định mức dịch vụ", createdById: opts.userId },
    });
  }
  await tx.caseService.update({ where: { id: opts.caseServiceId }, data: { bomApplied: true } });
}

export async function removeCaseService(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  if (caseId) {
    await withCaseLock(caseId, async (tx) => {
      await tx.caseService.delete({ where: { id } }).catch(() => {});
      await recalc(caseId, tx);
    });
    refresh(caseId);
  } else {
    await prisma.caseService.delete({ where: { id } }).catch(() => {});
  }
}

// ---- Sửa dịch vụ trong hồ sơ ----
const serviceEditSchema = serviceSchema.extend({ id: z.string().min(1) });

export async function updateCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
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
  const finalPrice = Math.max(d.unitPrice * d.quantity - d.discount, 0);
  const listPrice = d.listPrice > 0 ? d.listPrice : d.unitPrice;

  await withCaseLock(d.caseId, async (tx) => {
    await tx.caseService.update({
      where: { id: d.id },
      data: { name: d.name, listPrice, unitPrice: d.unitPrice, quantity: d.quantity, discount: d.discount, finalPrice },
    });
    await recalc(d.caseId, tx);
  });
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

  await withCaseLock(d.caseId, async (tx) => {
    await tx.caseRecord.update({
      where: { id: d.caseId },
      data: { voucherAmount: amount, voucherCode: label },
    });
    await recalc(d.caseId, tx);
  });
  await audit(user.id, "APPLY_VOUCHER", { entity: "CaseRecord", entityId: d.caseId, meta: { amount, code: label ?? "" } });
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm thanh toán ----
const paymentSchema = z.object({
  caseId: z.string().min(1),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
  method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]),
  note: z.string().trim().optional(),
});

export async function addPayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.add");
  const caseId = String(formData.get("caseId") ?? "");
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = paymentSchema.safeParse({
    caseId,
    amount: formData.get("amount") ?? 0,
    method: formData.get("method") ?? "CASH",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  await withCaseLock(d.caseId, async (tx) => {
    await tx.payment.create({
      data: { caseId: d.caseId, amount: d.amount, method: d.method, note: d.note || null, receivedById: user.id },
    });
    await recalc(d.caseId, tx);
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa thanh toán (chỉ quản trị / quản lý — liên quan tiền) ----
const paymentEditSchema = paymentSchema.extend({ id: z.string().min(1) });

export async function updatePayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.manage");
  const caseId = String(formData.get("caseId") ?? "");
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

  await withCaseLock(d.caseId, async (tx) => {
    await tx.payment.update({
      where: { id: d.id },
      data: { amount: d.amount, method: d.method, note: d.note || null, ...(paidAt ? { paidAt } : {}) },
    });
    await recalc(d.caseId, tx);
  });
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

  // Chỉ trừ kho khi vật tư còn TỒN TẠI trong danh mục (tránh FK lỗi nếu vật tư vừa bị xóa).
  let materialId: string | null = d.materialId || null;
  let outUnitCost: number | null = null; // giá vốn bình quân tại thời điểm xuất (ghi nhận COGS)
  if (materialId) {
    const mat = await prisma.material.findUnique({ where: { id: materialId }, select: { avgCost: true } });
    if (!mat) materialId = null; // vật tư đã bị xóa → lưu như nhập tay (snapshot tên), không trừ kho
    else outUnitCost = toNum(mat.avgCost) > 0 ? toNum(mat.avgCost) : null;
  }

  // Ghi nhận sử dụng + xuất kho (trừ tồn + nhật ký) trong CÙNG một giao dịch → không bao giờ
  // còn cảnh "đã ghi vật tư nhưng kho chưa trừ".
  await prisma.$transaction(async (tx) => {
    await tx.materialUsage.create({
      data: {
        caseId: d.caseId,
        materialId,
        name: d.name,
        unit: d.unit,
        quantity: d.quantity,
        note: d.note || null,
        performedById: user.id,
      },
    });
    if (materialId) {
      await tx.material.update({ where: { id: materialId }, data: { stock: { decrement: d.quantity } } });
      await tx.stockMovement.create({
        data: { materialId, type: "OUT", quantity: d.quantity, unitCost: outUnitCost, note: "Dùng cho hồ sơ", createdById: user.id },
      });
    }
  });
  return { ok: true, nonce: Date.now() };
}

export async function removeMaterial(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const usage = await prisma.materialUsage.findUnique({ where: { id }, select: { materialId: true, quantity: true } });
  if (!usage) return;
  // Xóa usage + hoàn kho (nếu thuộc danh mục) nguyên tử.
  await prisma.$transaction(async (tx) => {
    await tx.materialUsage.delete({ where: { id } });
    if (usage.materialId) {
      const q = toNum(usage.quantity);
      const mat = await tx.material.findUnique({ where: { id: usage.materialId }, select: { avgCost: true } });
      const uc = mat && toNum(mat.avgCost) > 0 ? toNum(mat.avgCost) : null;
      await tx.material.update({ where: { id: usage.materialId }, data: { stock: { increment: q } } });
      await tx.stockMovement.create({
        data: { materialId: usage.materialId, type: "IN", quantity: q, unitCost: uc, note: "Hoàn kho (xóa vật tư)", createdById: user.id },
      });
    }
  });
  if (caseId) refresh(caseId);
}

// ---- Sửa vật tư trong hồ sơ (điều chỉnh tồn kho theo chênh lệch số lượng) ----
const materialEditSchema = materialSchema.extend({ id: z.string().min(1) });

export async function updateMaterialUsage(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
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
  if (!existing) return { error: "Không tìm thấy vật tư cần sửa." };

  const delta = d.quantity - toNum(existing.quantity);

  // Cập nhật usage + điều chỉnh tồn kho theo chênh lệch số lượng, nguyên tử.
  // (dương = dùng thêm → trừ kho; âm = trả lại kho).
  await prisma.$transaction(async (tx) => {
    await tx.materialUsage.update({
      where: { id: d.id },
      data: { name: d.name, unit: d.unit, quantity: d.quantity, note: d.note || null },
    });
    if (existing.materialId && delta !== 0) {
      const mat = await tx.material.findUnique({ where: { id: existing.materialId }, select: { avgCost: true } });
      const uc = mat && toNum(mat.avgCost) > 0 ? toNum(mat.avgCost) : null;
      await tx.material.update({ where: { id: existing.materialId }, data: { stock: { decrement: delta } } });
      await tx.stockMovement.create({
        data: {
          materialId: existing.materialId,
          type: delta > 0 ? "OUT" : "IN",
          quantity: Math.abs(delta),
          unitCost: uc,
          note: "Điều chỉnh vật tư (sửa hồ sơ)",
          createdById: user.id,
        },
      });
    }
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Trừ vật tư theo ĐỊNH MỨC (BOM) của dịch vụ — B5 giai đoạn 2 ----
// Khi thêm dịch vụ (gắn danh mục) vào hồ sơ, nhân viên bấm nút này để hệ thống tự ghi
// nhận vật tư đã dùng theo định mức × số lượng dịch vụ + trừ kho (nguyên tử). Cờ
// CaseService.bomApplied chống trừ 2 lần. Vật tư cần thêm/bớt khác vẫn ghi tay như cũ.
export async function applyServiceBom(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const caseServiceId = String(formData.get("caseServiceId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseServiceId || !caseId || (await isLockedFor(caseId, user.role))) return;

  const cs = await prisma.caseService.findUnique({
    where: { id: caseServiceId },
    select: { id: true, caseId: true, serviceId: true, quantity: true, bomApplied: true },
  });
  if (!cs || cs.caseId !== caseId || !cs.serviceId || cs.bomApplied) return;

  // Dùng chung helper với addCaseService (auto-apply). Trong 1 giao dịch.
  await prisma.$transaction(async (tx) => {
    await applyBomTx(tx, { caseServiceId, caseId, serviceId: cs.serviceId as string, quantity: cs.quantity, userId: user.id });
  });
  refresh(caseId);
}

// ---- Tải ảnh trước / sau / tái khám ----
// KHÔNG nhận SVG (có thể chứa mã độc) — chỉ ảnh bitmap an toàn.
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadPhoto(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };
  const type = String(formData.get("type") ?? "BEFORE");
  const caption = String(formData.get("caption") ?? "").trim();
  const followUpIndex = Number(formData.get("followUpIndex") ?? 0) || null;
  const file = formData.get("file");

  if (!caseId || !customerId) return { error: "Thiếu thông tin hồ sơ." };
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
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.photo.delete({ where: { id } }).catch(() => {});
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
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const pay = await prisma.payment.findUnique({ where: { id }, select: { amount: true } });
  if (caseId) {
    await withCaseLock(caseId, async (tx) => {
      await tx.payment.delete({ where: { id } });
      await recalc(caseId, tx);
    });
    refresh(caseId);
  } else {
    await prisma.payment.delete({ where: { id } });
  }
  await audit(user.id, "DELETE_PAYMENT", { entity: "Payment", entityId: id, meta: { amount: toNum(pay?.amount), caseId } });
}

// ---- Xóa lịch tái khám ----
export async function deleteFollowUp(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.followUp.delete({ where: { id } }).catch(() => {});
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
