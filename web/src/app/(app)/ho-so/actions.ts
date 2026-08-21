"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireCap } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { toNum, formatVND } from "@/lib/money";
import { summarizeCase, validatePaymentAmount, validateServicePrice, normalizeServicePrice } from "@/lib/financial-summary";
import { bomNeeds, type BomLine } from "@/lib/service-bom";
import { isAllowedDocMime, docExt, safeStoredName, sniffImageExt, isDocumentBufferValid } from "@/lib/upload";
import { getUploadDir, getUploadStorageError } from "@/lib/upload-storage";
import { canAccessCase, type CaseAccess, type CaseAccessUser } from "@/lib/case-access";
import { validateAllocations, type AllocationRole } from "@/lib/revenue-attribution";
import { defaultScreening, normalizeScreening } from "@/lib/consultation-sheet";
import type { Prisma } from "@/generated/prisma/client";

// Client dùng được cho cả prisma thường lẫn trong $transaction.
type Db = Prisma.TransactionClient | typeof prisma;

export type CaseActionState = { ok?: boolean; error?: string; nonce?: number };

const LOCKED_MSG = "Hồ sơ đã khóa — không thể chỉnh sửa. Vui lòng liên hệ quản trị viên để mở lại.";
const CASE_ACCESS_MSG = "Bạn không có quyền thao tác trên hồ sơ này.";

async function hasCaseAccess(
  user: CaseAccessUser,
  caseId: string,
  access: CaseAccess,
  db: Db = prisma,
): Promise<boolean> {
  if (!caseId) return false;
  const record = await db.caseRecord.findUnique({ where: { id: caseId }, select: { consultantId: true, doctorId: true } });
  return !!record && canAccessCase(user, record, access);
}

/** Hồ sơ đã khóa thì chỉ ADMIN mới được sửa. */
async function isLockedFor(caseId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return false;
  const c = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { locked: true } });
  return !!c?.locked;
}

/**
 * Tính lại tổng tiền / đã trả / công nợ cho hồ sơ (hoa hồng nhập tay, không tự tính).
 * Toán đặt ở `lib/financial-summary.ts` (`summarizeCase`, thuần, có test). Nhận `db` để
 * chạy trong $transaction.
 */
async function recalc(caseId: string, db: Db = prisma): Promise<void> {
  const [services, payments, rec] = await Promise.all([
    db.caseService.findMany({ where: { caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }),
    db.payment.findMany({ where: { caseId }, select: { amount: true } }),
    db.caseRecord.findUnique({ where: { id: caseId }, select: { voucherAmount: true } }),
  ]);
  const totals = summarizeCase({ services, payments, voucherAmount: rec?.voucherAmount });
  await db.caseRecord.update({
    where: { id: caseId },
    data: { totalAmount: totals.total, discountAmount: totals.lineDiscount, paidAmount: totals.paid, debtAmount: totals.debt },
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
  // Công nợ hồ sơ (debtAmount) đổi theo mọi thao tác tiền của hồ sơ — các trang
  // này cũng hiển thị công nợ khách nên phải nằm chung danh sách làm mới.
  revalidatePath("/cong-no");
  revalidatePath("/luong");
  revalidatePath("/ke-toan");
  revalidatePath("/hieu-suat");
  if (customerId) revalidatePath(`/khach-hang/${customerId}`);
}

// ---- Khóa / mở khóa hồ sơ ----
export async function lockCase(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("caseId") ?? "");
  if (!id || !(await hasCaseAccess(user, id, "clinical"))) return;
  await withCaseLock(id, async (tx) => {
    await tx.caseRecord.update({ where: { id }, data: { locked: true, lockedAt: new Date(), lockedById: user.id } });
    await auditRequired(tx, user.id, "LOCK_CASE", { entity: "CaseRecord", entityId: id });
  });
  refresh(id);
}

export async function unlockCase(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("caseId") ?? "");
  if (!id) return;
  await withCaseLock(id, async (tx) => {
    await tx.caseRecord.update({ where: { id }, data: { locked: false, lockedAt: null, lockedById: null } });
    await auditRequired(tx, user.id, "UNLOCK_CASE", { entity: "CaseRecord", entityId: id });
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

const consultationSchema = z.object({
  caseId: z.string().min(1),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  heightCm: z.coerce.number().min(0).max(250).optional(),
  bloodType: z.string().trim().max(20).optional(),
  emergencyName: z.string().trim().max(120).optional(),
  emergencyPhone: z.string().trim().max(40).optional(),
  pulse: z.coerce.number().int().min(0).max(300).optional(),
  bloodPressure: z.string().trim().max(30).optional(),
  temperatureC: z.coerce.number().min(0).max(50).optional(),
  respiratoryRate: z.coerce.number().int().min(0).max(100).optional(),
  spo2: z.coerce.number().int().min(0).max(100).optional(),
  screeningJson: z.string().max(10000).optional(),
  patientConfirmed: z.coerce.boolean().default(false),
  wants: z.string().trim().max(3000).optional(),
  currentCondition: z.string().trim().max(3000).optional(),
  expectedResult: z.string().trim().max(3000).optional(),
  doctorIndication: z.string().trim().max(3000).optional(),
});

export async function saveConsultationRecord(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const parsed = consultationSchema.safeParse({
    caseId: formData.get("caseId"), weightKg: formData.get("weightKg") || undefined, heightCm: formData.get("heightCm") || undefined,
    bloodType: formData.get("bloodType") || "", emergencyName: formData.get("emergencyName") || "", emergencyPhone: formData.get("emergencyPhone") || "",
    pulse: formData.get("pulse") || undefined, bloodPressure: formData.get("bloodPressure") || "", temperatureC: formData.get("temperatureC") || undefined,
    respiratoryRate: formData.get("respiratoryRate") || undefined, spo2: formData.get("spo2") || undefined, screeningJson: formData.get("screeningJson") || "{}",
    patientConfirmed: formData.get("patientConfirmed") === "on" || formData.get("patientConfirmed") === "true", wants: formData.get("wants") || "",
    currentCondition: formData.get("currentCondition") || "", expectedResult: formData.get("expectedResult") || "", doctorIndication: formData.get("doctorIndication") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Sổ tư vấn chưa hợp lệ." };
  if (!(await hasCaseAccess(user, parsed.data.caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(parsed.data.caseId, user.role)) return { error: LOCKED_MSG };

  let screening: ReturnType<typeof defaultScreening>;
  try {
    screening = normalizeScreening(JSON.parse(parsed.data.screeningJson || "{}"));
  } catch {
    return { error: "Bảng sàng lọc không đúng định dạng." };
  }

  const existing = await prisma.consultationRecord.findUnique({ where: { caseId: parsed.data.caseId }, select: { id: true, updatedAt: true } });
  const lateEdit = !!existing && Date.now() - existing.updatedAt.getTime() > 24 * 60 * 60 * 1000;
  if (lateEdit && user.role !== "ADMIN") return { error: "Sổ tư vấn đã quá 24 giờ; chỉ ADMIN được sửa bổ sung." };

  const data = {
    weightKg: parsed.data.weightKg ?? null, heightCm: parsed.data.heightCm ?? null, bloodType: parsed.data.bloodType || null,
    emergencyName: parsed.data.emergencyName || null, emergencyPhone: parsed.data.emergencyPhone || null, pulse: parsed.data.pulse ?? null,
    bloodPressure: parsed.data.bloodPressure || null, temperatureC: parsed.data.temperatureC ?? null, respiratoryRate: parsed.data.respiratoryRate ?? null,
    spo2: parsed.data.spo2 ?? null, screening, patientConfirmed: parsed.data.patientConfirmed, patientConfirmedAt: parsed.data.patientConfirmed ? new Date() : null,
    wants: parsed.data.wants || null, currentCondition: parsed.data.currentCondition || null, expectedResult: parsed.data.expectedResult || null,
    doctorIndication: parsed.data.doctorIndication || null, createdById: user.id, finalizedAt: parsed.data.patientConfirmed ? new Date() : null,
  };
  await withCaseLock(parsed.data.caseId, async (tx) => {
    const saved = existing
      ? await tx.consultationRecord.update({ where: { id: existing.id }, data })
      : await tx.consultationRecord.create({ data: { ...data, caseId: parsed.data.caseId } });
    await auditRequired(tx, user.id, lateEdit ? "LATE_UPDATE_CONSULTATION" : "UPDATE_CONSULTATION", { entity: "ConsultationRecord", entityId: saved.id, meta: { lateEdit, patientConfirmed: parsed.data.patientConfirmed } });
  });
  refresh(parsed.data.caseId);
  return { ok: true, nonce: Date.now() };
}

const consultationPrintOverrideSchema = z.object({
  caseId: z.string().min(1),
  fullName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300),
  phoneLast5: z.string().regex(/^\d{5}$/, "Số điện thoại phải là 5 số cuối."),
  wants: z.string().trim().max(3000),
  currentCondition: z.string().trim().max(3000),
  expectedResult: z.string().trim().max(3000),
  doctorIndication: z.string().trim().max(3000),
  extraNote: z.string().trim().max(3000),
});

export async function saveConsultationPrintOverrides(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const parsed = consultationPrintOverrideSchema.safeParse({
    caseId: formData.get("caseId"),
    fullName: formData.get("fullName") ?? "",
    address: formData.get("address") ?? "",
    phoneLast5: formData.get("phoneLast5") ?? "",
    wants: formData.get("wants") ?? "",
    currentCondition: formData.get("currentCondition") ?? "",
    expectedResult: formData.get("expectedResult") ?? "",
    doctorIndication: formData.get("doctorIndication") ?? "",
    extraNote: formData.get("extraNote") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nội dung phiếu chưa hợp lệ." };
  const { caseId, ...printOverrides } = parsed.data;
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };
  const consultation = await prisma.consultationRecord.findUnique({ where: { caseId }, select: { id: true } });
  if (!consultation) return { error: "Hồ sơ chưa có Hồ sơ dịch vụ thẩm mỹ mặc định. Hãy tải lại hồ sơ hoặc liên hệ quản trị." };

  await withCaseLock(caseId, async (tx) => {
    await tx.consultationRecord.update({
      where: { id: consultation.id },
      data: { printOverrides: { ...printOverrides, editedAt: new Date().toISOString(), editedById: user.id } satisfies Prisma.InputJsonValue },
    });
    await auditRequired(tx, user.id, "EDIT_CONSULTATION_PRINT", { entity: "ConsultationRecord", entityId: consultation.id, meta: { caseId, fields: Object.keys(printOverrides) } });
  });
  refresh(caseId);
  return { ok: true, nonce: Date.now() };
}

export async function updateCaseInfo(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
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

  await withCaseLock(d.caseId, async (tx) => {
    await tx.caseRecord.update({
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
    await auditRequired(tx, user.id, "UPDATE_CASE_INFO", { entity: "CaseRecord", entityId: d.caseId, meta: { status: d.status, consultResult: d.consultResult } });
  });
  return { ok: true, nonce: Date.now() };
}

const revenueAllocationSchema = z.object({
  caseId: z.string().min(1),
  allocations: z.array(z.object({
    userId: z.string().min(1),
    role: z.enum(["CONSULTANT", "DOCTOR", "NURSE", "OTHER"]),
    shareBps: z.coerce.number().int().positive().max(10_000),
    note: z.string().trim().max(500).optional(),
  })).min(1),
});

/** Lưu người phối hợp và tỷ lệ DS; chỉ ADMIN, luôn thay thế toàn bộ cấu hình cũ atomically. */
export async function saveCaseRevenueAllocations(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const me = await requireUser(["ADMIN"]);
  const caseId = String(formData.get("caseId") ?? "");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("allocations") ?? "[]"));
  } catch {
    return { error: "Danh sách phân bổ không đúng định dạng." };
  }
  const parsed = revenueAllocationSchema.safeParse({ caseId, allocations: raw });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu phân bổ không hợp lệ." };
  const validation = validateAllocations(parsed.data.allocations, true);
  if (!validation.ok) return { error: validation.error };

  let failure: string | undefined;
  await withCaseLock(caseId, async (tx) => {
    const record = await tx.caseRecord.findUnique({ where: { id: caseId }, select: { id: true, locked: true } });
    if (!record) { failure = "Không tìm thấy hồ sơ."; return; }
    const users = await tx.user.findMany({ where: { id: { in: parsed.data.allocations.map((a) => a.userId) }, active: true }, select: { id: true } });
    if (users.length !== new Set(parsed.data.allocations.map((a) => a.userId)).size) { failure = "Có nhân sự không tồn tại hoặc đã ngừng hoạt động."; return; }
    const before = await tx.caseRevenueAllocation.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
    await tx.caseRevenueAllocation.deleteMany({ where: { caseId } });
    await tx.caseRevenueAllocation.createMany({
      data: parsed.data.allocations.map((a) => ({ caseId, userId: a.userId, role: a.role as AllocationRole, shareBps: a.shareBps, note: a.note || null, createdById: me.id })),
    });
    await auditRequired(tx, me.id, "UPDATE_REVENUE_ALLOCATION", {
      entity: "CaseRecord",
      entityId: caseId,
      meta: {
        before: before.map((a) => ({ userId: a.userId, role: a.role, shareBps: a.shareBps })),
        after: parsed.data.allocations,
        totalShareBps: validation.totalShareBps,
      },
    });
  });
  if (failure) return { error: failure };
  refresh(caseId);
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa NGÀY TẠO hồ sơ (CHỈ quản trị viên) ----
// Dùng khi khách đông, hồ sơ tạo sau ngày khách thực đến. Chỉ ADMIN để tránh gian lận.
export async function updateCaseDate(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const me = await requireUser(["ADMIN"]);
  const caseId = String(formData.get("caseId") ?? "");
  const raw = String(formData.get("createdAt") ?? "").trim();
  if (!caseId) return { error: "Thiếu hồ sơ." };
  if (!(await hasCaseAccess(me, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (!raw) return { error: "Vui lòng chọn ngày." };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "Ngày không hợp lệ." };
  if (d.getTime() > Date.now() + 60_000) return { error: "Ngày tạo không thể ở tương lai." };

  await withCaseLock(caseId, async (tx) => {
    await tx.caseRecord.update({ where: { id: caseId }, data: { createdAt: d } });
    await auditRequired(tx, me.id, "EDIT_CASE_DATE", { entity: "CaseRecord", entityId: caseId, meta: { createdAt: raw } });
  });
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
  nurseId: z.string().optional(),
});

export async function addCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = serviceSchema.safeParse({
    caseId,
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name") ?? "",
    listPrice: formData.get("listPrice") ?? 0,
    unitPrice: formData.get("unitPrice") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    discount: formData.get("discount") ?? 0,
    nurseId: formData.get("nurseId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const priceValidation = validateServicePrice(d);
  if (!priceValidation.ok) return { error: priceValidation.error };
  const { listPrice, unitPrice, discount, quantity: qty } = normalizeServicePrice({
    listPrice: d.listPrice > 0 ? d.listPrice : d.unitPrice, // không có giá gốc → lấy giá ưu đãi
    unitPrice: d.unitPrice,
    quantity: d.quantity,
    discount: d.discount,
  });
  const finalPrice = Math.max(unitPrice * qty - discount, 0);

  const c = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { doctorId: true } });
  await withCaseLock(d.caseId, async (tx) => {
    const created = await tx.caseService.create({
      data: {
        caseId: d.caseId,
        serviceId: d.serviceId || null,
        name: d.name,
        listPrice,
        unitPrice,
        quantity: qty,
        discount,
        finalPrice,
        doctorId: c?.doctorId ?? null,
        nurseId: d.nurseId || null,
      },
    });
    // TỰ ĐỘNG trừ kho theo định mức (BOM) nếu dịch vụ có khai báo định mức vật tư.
    // (Trước đây phải bấm nút "Trừ VT" thủ công.) Dịch vụ không có định mức → bỏ qua.
    const bomApplied = created.serviceId
      ? await applyBomTx(tx, { caseServiceId: created.id, caseId: d.caseId, serviceId: created.serviceId, quantity: created.quantity, userId: user.id })
      : false;
    await recalc(d.caseId, tx);
    await auditRequired(tx, user.id, "CREATE_CASE_SERVICE", {
      entity: "CaseService",
      entityId: created.id,
      meta: { caseId: d.caseId, serviceId: created.serviceId, quantity: d.quantity, amount: finalPrice, bomApplied },
    });
  });
  return { ok: true, nonce: Date.now() };
}

/**
 * Hoàn kho cho các dòng MaterialUsage TRƯỚC KHI xóa — dùng khi xóa cả hồ sơ/khách hàng
 * (khác `removeMaterial()`, xóa 1 dòng vật tư đơn lẻ, nhưng phải hoàn kho giống hệt vậy:
 * nếu không, tồn kho bị trừ vĩnh viễn dù ca điều trị không còn tồn tại).
 */
export async function restoreMaterialUsageStock(
  tx: Prisma.TransactionClient,
  usages: { materialId: string | null; quantity: unknown }[],
  userId: string,
  note: string,
): Promise<void> {
  for (const usage of usages) {
    if (!usage.materialId) continue;
    const q = toNum(usage.quantity);
    if (q <= 0) continue;
    const mat = await tx.material.findUnique({ where: { id: usage.materialId }, select: { avgCost: true } });
    const uc = mat && toNum(mat.avgCost) > 0 ? toNum(mat.avgCost) : null;
    await tx.material.update({ where: { id: usage.materialId }, data: { stock: { increment: q } } });
    await tx.stockMovement.create({
      data: { materialId: usage.materialId, type: "IN", quantity: q, unitCost: uc, note, createdById: userId },
    });
  }
}

// Trừ vật tư theo ĐỊNH MỨC (BOM) của 1 dòng dịch vụ, trong 1 giao dịch `tx`.
// No-op nếu dịch vụ chưa khai báo định mức. Đánh dấu bomApplied để chống trừ 2 lần.
async function applyBomTx(
  tx: Prisma.TransactionClient,
  opts: { caseServiceId: string; caseId: string; serviceId: string; quantity: number; userId: string },
): Promise<boolean> {
  // Re-read and lock the line inside the same transaction. The preflight read
  // in the action is not enough: two submits can otherwise both see
  // bomApplied=false and decrement stock twice.
  const serviceRow = await tx.caseService.findUnique({
    where: { id: opts.caseServiceId },
    select: { caseId: true, bomApplied: true },
  });
  if (!serviceRow || serviceRow.caseId !== opts.caseId || serviceRow.bomApplied) return false;

  const bom = await tx.serviceMaterial.findMany({
    where: { serviceId: opts.serviceId },
    include: { material: { select: { name: true, unit: true, stock: true, avgCost: true } } },
  });
  if (bom.length === 0) return false;
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
    const lockedMaterial = await tx.$queryRaw<Array<{ stock: unknown; avgCost: unknown }>>`
      SELECT stock, "avgCost" FROM "Material" WHERE id = ${n.materialId} FOR UPDATE
    `;
    const currentStock = toNum(lockedMaterial[0]?.stock);
    if (!lockedMaterial[0] || currentStock < n.need) {
      throw new Error(`Không đủ tồn kho vật tư “${n.name}” (còn ${currentStock}, cần ${n.need}).`);
    }
    const outUnitCost = toNum(lockedMaterial[0].avgCost) > 0 ? toNum(lockedMaterial[0].avgCost) : null; // giá vốn bình quân → COGS
    await tx.materialUsage.create({
      data: {
        caseId: opts.caseId,
        caseServiceId: opts.caseServiceId,
        materialId: n.materialId,
        name: n.name,
        unit: n.unit,
        quantity: n.need,
        note: "Theo định mức dịch vụ",
        performedById: opts.userId,
      },
    });
    await tx.material.update({ where: { id: n.materialId }, data: { stock: { decrement: n.need } } });
    await tx.stockMovement.create({
      data: { materialId: n.materialId, type: "OUT", quantity: n.need, unitCost: outUnitCost, note: "Định mức dịch vụ", createdById: opts.userId },
    });
  }
  await tx.caseService.update({ where: { id: opts.caseServiceId }, data: { bomApplied: true } });
  return true;
}

export async function removeCaseService(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;
  if (caseId) {
    await withCaseLock(caseId, async (tx) => {
      const service = await tx.caseService.findFirst({ where: { id, caseId }, select: { id: true, name: true, bomApplied: true } });
      if (!service) return;

      // Xóa dòng này không được làm tổng hồ sơ tụt xuống dưới số tiền ĐÃ THU
      // — giống lý do chặn ở sửa dịch vụ/áp voucher.
      const [record, otherServices, payments] = await Promise.all([
        tx.caseRecord.findUnique({ where: { id: caseId }, select: { voucherAmount: true } }),
        tx.caseService.findMany({
          where: { caseId, NOT: { id } },
          select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true },
        }),
        tx.payment.findMany({ where: { caseId }, select: { amount: true } }),
      ]);
      const after = summarizeCase({ services: otherServices, payments, voucherAmount: record?.voucherAmount });
      if (after.overpaid > 0) {
        throw new Error(
          `Không thể xóa: hồ sơ đã thu ${formatVND(after.paid)}, nếu xóa dịch vụ này tổng chỉ còn ${formatVND(after.total)}. Vui lòng sửa/hoàn khoản thu trước.`,
        );
      }

      // A BOM-backed service has already consumed stock. Deleting only the
      // CaseService would leave the usage rows behind and permanently lose
      // inventory. Restore every BOM usage atomically before removing it.
      const bomUsages = service.bomApplied
        ? await tx.materialUsage.findMany({ where: { caseServiceId: service.id }, select: { materialId: true, quantity: true } })
        : [];
      for (const usage of bomUsages) {
        if (!usage.materialId) continue;
        const lockedMaterial = await tx.$queryRaw<Array<{ avgCost: unknown }>>`
          SELECT "avgCost" FROM "Material" WHERE id = ${usage.materialId} FOR UPDATE
        `;
        if (!lockedMaterial[0]) continue;
        const quantity = toNum(usage.quantity);
        const unitCost = toNum(lockedMaterial[0].avgCost) > 0 ? toNum(lockedMaterial[0].avgCost) : null;
        await tx.material.update({ where: { id: usage.materialId }, data: { stock: { increment: quantity } } });
        await tx.stockMovement.create({
          data: { materialId: usage.materialId, type: "IN", quantity, unitCost, note: "Hoàn kho (xóa dịch vụ theo định mức)", createdById: user.id },
        });
      }
      if (service.bomApplied) await tx.materialUsage.deleteMany({ where: { caseServiceId: service.id } });
      await tx.caseService.delete({ where: { id: service.id } });
      await recalc(caseId, tx);
      await auditRequired(tx, user.id, "DELETE_CASE_SERVICE", {
        entity: "CaseService",
        entityId: service.id,
        meta: { caseId, name: service.name, restoredBomUsages: bomUsages.length },
      });
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
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
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
    nurseId: formData.get("nurseId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const priceValidation = validateServicePrice(d);
  if (!priceValidation.ok) return { error: priceValidation.error };
  const { listPrice, unitPrice, discount, quantity: qty } = normalizeServicePrice({
    listPrice: d.listPrice > 0 ? d.listPrice : d.unitPrice,
    unitPrice: d.unitPrice,
    quantity: d.quantity,
    discount: d.discount,
  });
  const finalPrice = Math.max(unitPrice * qty - discount, 0);

  const result = await withCaseLock(d.caseId, async (tx) => {
    const existing = await tx.caseService.findFirst({ where: { id: d.id, caseId: d.caseId }, select: { id: true, bomApplied: true } });
    if (!existing) throw new Error("Không tìm thấy dịch vụ thuộc hồ sơ này.");
    if (existing.bomApplied) throw new Error("Dịch vụ đã trừ vật tư theo định mức; hãy hoàn vật tư trước khi sửa dòng này.");

    // Sửa giá/số lượng/giảm giá của dòng này không được làm tổng hồ sơ tụt
    // xuống dưới số tiền ĐÃ THU — nếu không, hồ sơ sẽ hiện "Tổng thấp hơn Đã
    // trả" giống hệt lỗi dữ liệu cũ đã từng gặp, nhưng lần này là dữ liệu MỚI.
    const [record, otherServices, payments] = await Promise.all([
      tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { voucherAmount: true } }),
      tx.caseService.findMany({
        where: { caseId: d.caseId, NOT: { id: d.id } },
        select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true },
      }),
      tx.payment.findMany({ where: { caseId: d.caseId }, select: { amount: true } }),
    ]);
    const after = summarizeCase({
      services: [...otherServices, { listPrice, unitPrice, quantity: qty, discount, finalPrice }],
      payments,
      voucherAmount: record?.voucherAmount,
    });
    if (after.overpaid > 0) {
      return {
        error: `Không thể lưu: sửa dòng này khiến tổng hồ sơ chỉ còn ${formatVND(after.total)}, thấp hơn số tiền đã thu ${formatVND(after.paid)}. Vui lòng sửa/hoàn khoản thu trước.`,
      };
    }

    await tx.caseService.update({
      where: { id: d.id },
      data: { name: d.name, listPrice, unitPrice, quantity: qty, discount, finalPrice, nurseId: d.nurseId || null },
    });
    await recalc(d.caseId, tx);
    await auditRequired(tx, user.id, "UPDATE_CASE_SERVICE", {
      entity: "CaseService",
      entityId: d.id,
      meta: { caseId: d.caseId, quantity: d.quantity, amount: finalPrice },
    });
    return null;
  });
  if (result?.error) return { error: result.error };
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
  if (!(await hasCaseAccess(user, caseId, "payment.manage"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = voucherSchema.safeParse({
    caseId,
    voucherKind: formData.get("voucherKind") ?? "VND",
    voucherValue: formData.get("voucherValue") ?? 0,
    voucherCode: formData.get("voucherCode") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const result = await withCaseLock(d.caseId, async (tx) => {
    // Use the same legacy-safe fallback as all other financial views. An
    // aggregate over finalPrice alone loses voucher value for imported rows
    // where only unitPrice/listPrice was preserved.
    const [services, payments] = await Promise.all([
      tx.caseService.findMany({
        where: { caseId: d.caseId },
        select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true },
      }),
      tx.payment.findMany({ where: { caseId: d.caseId }, select: { amount: true } }),
    ]);
    const subtotal = summarizeCase({ services, payments: [], voucherAmount: 0 }).subtotal;
    let amount = d.voucherKind === "PCT" ? Math.round((subtotal * d.voucherValue) / 100) : Math.round(d.voucherValue);
    amount = Math.max(0, Math.min(amount, subtotal));

    // Voucher càng lớn thì tổng càng nhỏ — không được để tổng tụt xuống dưới
    // tiền đã thu (giống lý do chặn ở sửa/xóa dịch vụ).
    const after = summarizeCase({ services, payments, voucherAmount: amount });
    if (after.overpaid > 0) {
      return {
        error: `Không thể áp voucher này: tổng hồ sơ chỉ còn ${formatVND(after.total)}, thấp hơn số tiền đã thu ${formatVND(after.paid)}. Vui lòng sửa/hoàn khoản thu trước.`,
      };
    }

    const label =
      amount > 0
        ? `${d.voucherCode || "Voucher"}${d.voucherKind === "PCT" ? ` (-${d.voucherValue}%)` : ""}`
        : null;
    await tx.caseRecord.update({
      where: { id: d.caseId },
      data: { voucherAmount: amount, voucherCode: label },
    });
    await recalc(d.caseId, tx);
    await auditRequired(tx, user.id, "APPLY_VOUCHER", { entity: "CaseRecord", entityId: d.caseId, meta: { amount, code: label ?? "" } });
    return null;
  });
  if (result?.error) return { error: result.error };
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm thanh toán ----
const paymentSchema = z.object({
  caseId: z.string().min(1),
  clientNonce: z.string().min(16).max(128),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
  method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]),
  note: z.string().trim().optional(),
});

export async function addPayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.add");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "payment.add"))) return { error: CASE_ACCESS_MSG };
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
  await withCaseLock(d.caseId, async (tx) => {
    const duplicate = await tx.payment.findUnique({ where: { clientNonce: d.clientNonce }, select: { id: true, caseId: true, amount: true, method: true, note: true } });
    if (duplicate) {
      const sameRequest = duplicate.caseId === d.caseId && toNum(duplicate.amount) === d.amount && duplicate.method === d.method && (duplicate.note ?? "") === (d.note ?? "");
      if (sameRequest) return;
      throw new Error("Mã yêu cầu thu tiền đã được sử dụng cho dữ liệu khác.");
    }
    const [record, services, payments] = await Promise.all([
      tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { voucherAmount: true } }),
      tx.caseService.findMany({ where: { caseId: d.caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }),
      tx.payment.findMany({ where: { caseId: d.caseId }, select: { amount: true } }),
    ]);
    if (!record) throw new Error("Không tìm thấy hồ sơ.");
    const current = summarizeCase({ services, payments, voucherAmount: record.voucherAmount });
    const validation = validatePaymentAmount({ amount: d.amount, total: current.total, paid: current.paid });
    if (!validation.ok) throw new Error(validation.error);
    await tx.payment.create({
      data: { clientNonce: d.clientNonce, caseId: d.caseId, amount: d.amount, method: d.method, note: d.note || null, receivedById: user.id },
    });
    await recalc(d.caseId, tx);
    await auditRequired(tx, user.id, "CREATE_PAYMENT", { entity: "Payment", entityId: d.clientNonce, meta: { caseId: d.caseId, amount: d.amount, method: d.method } });
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa thanh toán (chỉ quản trị / quản lý — liên quan tiền) ----
const paymentEditSchema = paymentSchema.omit({ clientNonce: true }).extend({ id: z.string().min(1) });

export async function updatePayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("payment.manage");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "payment.manage"))) return { error: CASE_ACCESS_MSG };
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
    const [payment, record, services, payments] = await Promise.all([
      tx.payment.findFirst({ where: { id: d.id, caseId: d.caseId }, select: { amount: true } }),
      tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { voucherAmount: true } }),
      tx.caseService.findMany({ where: { caseId: d.caseId }, select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }),
      tx.payment.findMany({ where: { caseId: d.caseId, NOT: { id: d.id } }, select: { amount: true } }),
    ]);
    if (!payment || !record) throw new Error("Không tìm thấy khoản thu thuộc hồ sơ này.");
    const current = summarizeCase({ services, payments, voucherAmount: record.voucherAmount });
    const validation = validatePaymentAmount({ amount: d.amount, total: current.total, paid: current.paid });
    if (!validation.ok) throw new Error(validation.error);
    await tx.payment.update({
      where: { id: d.id },
      data: { amount: d.amount, method: d.method, note: d.note || null, ...(paidAt ? { paidAt } : {}) },
    });
    await recalc(d.caseId, tx);
    await auditRequired(tx, user.id, "UPDATE_PAYMENT", { entity: "Payment", entityId: d.id, meta: { caseId: d.caseId, amount: d.amount, paidAt: paidAt?.toISOString() } });
  });
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
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
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
  await withCaseLock(d.caseId, async (tx) => {
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
      const lockedMaterial = await tx.$queryRaw<Array<{ stock: unknown; avgCost: unknown }>>`
        SELECT stock, "avgCost" FROM "Material" WHERE id = ${materialId} FOR UPDATE
      `;
      const stock = toNum(lockedMaterial[0]?.stock);
      if (!lockedMaterial[0] || stock < d.quantity) {
        throw new Error(`Không đủ tồn kho vật tư “${d.name}” (còn ${stock}, cần ${d.quantity}).`);
      }
      outUnitCost = toNum(lockedMaterial[0].avgCost) > 0 ? toNum(lockedMaterial[0].avgCost) : null;
      await tx.material.update({ where: { id: materialId }, data: { stock: { decrement: d.quantity } } });
      await tx.stockMovement.create({
        data: { materialId, type: "OUT", quantity: d.quantity, unitCost: outUnitCost, note: "Dùng cho hồ sơ", createdById: user.id },
      });
    }
    await auditRequired(tx, user.id, "USE_MATERIAL", { entity: "MaterialUsage", meta: { caseId: d.caseId, materialId, quantity: d.quantity } });
  });
  return { ok: true, nonce: Date.now() };
}

export async function removeMaterial(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;
  // Xóa usage + hoàn kho (nếu thuộc danh mục) nguyên tử.
  await withCaseLock(caseId, async (tx) => {
    const usage = await tx.materialUsage.findFirst({ where: { id, caseId }, select: { materialId: true, quantity: true } });
    if (!usage) return;
    await tx.materialUsage.deleteMany({ where: { id, caseId } });
    if (usage.materialId) {
      const q = toNum(usage.quantity);
      const mat = await tx.material.findUnique({ where: { id: usage.materialId }, select: { avgCost: true } });
      const uc = mat && toNum(mat.avgCost) > 0 ? toNum(mat.avgCost) : null;
      await tx.material.update({ where: { id: usage.materialId }, data: { stock: { increment: q } } });
      await tx.stockMovement.create({
        data: { materialId: usage.materialId, type: "IN", quantity: q, unitCost: uc, note: "Hoàn kho (xóa vật tư)", createdById: user.id },
      });
    }
    await auditRequired(tx, user.id, "REMOVE_MATERIAL", { entity: "MaterialUsage", entityId: id, meta: { caseId, quantity: toNum(usage.quantity) } });
  });
  if (caseId) refresh(caseId);
}

// ---- Sửa vật tư trong hồ sơ (điều chỉnh tồn kho theo chênh lệch số lượng) ----
const materialEditSchema = materialSchema.extend({ id: z.string().min(1) });

export async function updateMaterialUsage(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
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

  // Cập nhật usage + điều chỉnh tồn kho theo chênh lệch số lượng, nguyên tử.
  // (dương = dùng thêm → trừ kho; âm = trả lại kho).
  let changed = false;
  await withCaseLock(d.caseId, async (tx) => {
    const existing = await tx.materialUsage.findFirst({
      where: { id: d.id, caseId: d.caseId },
      select: { materialId: true, quantity: true },
    });
    if (!existing) return;
    changed = true;
    const delta = d.quantity - toNum(existing.quantity);
    await tx.materialUsage.updateMany({
      where: { id: d.id, caseId: d.caseId },
      data: { name: d.name, unit: d.unit, quantity: d.quantity, note: d.note || null },
    });
    if (existing.materialId && delta !== 0) {
      const lockedMaterial = await tx.$queryRaw<Array<{ stock: unknown; avgCost: unknown }>>`
        SELECT stock, "avgCost" FROM "Material" WHERE id = ${existing.materialId} FOR UPDATE
      `;
      const stock = toNum(lockedMaterial[0]?.stock);
      if (!lockedMaterial[0]) throw new Error("Vật tư không còn tồn tại.");
      if (delta > 0 && stock < delta) throw new Error(`Không đủ tồn kho để điều chỉnh (còn ${stock}, cần thêm ${delta}).`);
      const uc = toNum(lockedMaterial[0].avgCost) > 0 ? toNum(lockedMaterial[0].avgCost) : null;
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
    await auditRequired(tx, user.id, "UPDATE_MATERIAL", { entity: "MaterialUsage", entityId: d.id, meta: { caseId: d.caseId, quantity: d.quantity, delta } });
  });
  if (!changed) return { error: "Không tìm thấy vật tư cần sửa." };
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
  if (!caseServiceId || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;

  const cs = await prisma.caseService.findUnique({
    where: { id: caseServiceId },
    select: { id: true, caseId: true, serviceId: true, quantity: true, bomApplied: true },
  });
  if (!cs || cs.caseId !== caseId || !cs.serviceId || cs.bomApplied) return;

  // Dùng chung helper với addCaseService (auto-apply). Trong 1 giao dịch.
  await withCaseLock(caseId, async (tx) => {
    const applied = await applyBomTx(tx, { caseServiceId, caseId, serviceId: cs.serviceId as string, quantity: cs.quantity, userId: user.id });
    if (applied) {
      await auditRequired(tx, user.id, "APPLY_SERVICE_BOM", { entity: "CaseService", entityId: caseServiceId, meta: { caseId, serviceId: cs.serviceId } });
    }
  });
  refresh(caseId);
}

// ---- Tải ảnh trước / sau / tái khám ----
export async function uploadPhoto(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };
  const typeParsed = z.enum(["BEFORE", "AFTER", "FOLLOW_UP", "CLINICAL"]).safeParse(String(formData.get("type") ?? "BEFORE"));
  if (!typeParsed.success) return { error: "Loại ảnh không hợp lệ." };
  const type = typeParsed.data;
  const caption = String(formData.get("caption") ?? "").trim();
  const followUpIndex = Number(formData.get("followUpIndex") ?? 0) || null;
  const file = formData.get("file");

  if (!caseId) return { error: "Thiếu thông tin hồ sơ." };
  const owner = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { customerId: true } });
  if (!owner || (customerId && owner.customerId !== customerId)) return { error: CASE_ACCESS_MSG };
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn ảnh." };
  if (file.size > 8 * 1024 * 1024) return { error: "Ảnh tối đa 8MB." };
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = sniffImageExt(buffer);
  if (!ext || !["jpg", "png", "webp", "heic"].includes(ext)) return { error: "Tệp không phải ảnh bitmap hợp lệ (JPG, PNG, WEBP, HEIC)." };
  const storageError = getUploadStorageError();
  if (storageError) return { error: storageError };
  const fname = `${caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fname), buffer);

  try {
    await prisma.$transaction(async (tx) => {
      const photo = await tx.photo.create({
        data: {
          customerId: owner.customerId,
          caseId,
          type,
          url: `/media/${fname}`,
          caption: caption || null,
          followUpIndex,
          uploadedById: user.id,
        },
      });
      await auditRequired(tx, user.id, "UPLOAD_PHOTO", { entity: "Photo", entityId: photo.id, meta: { caseId, type } });
    });
  } catch {
    await fs.rm(path.join(dir, fname), { force: true }).catch(() => {});
    return { error: "Không thể lưu ảnh lúc này. Vui lòng thử lại." };
  }
  return { ok: true, nonce: Date.now() };
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;
  await withCaseLock(caseId, async (tx) => {
    const deleted = await tx.photo.deleteMany({ where: { id, caseId } });
    if (deleted.count > 0) await auditRequired(tx, user.id, "DELETE_PHOTO", { entity: "Photo", entityId: id, meta: { caseId } });
  });
  if (caseId) refresh(caseId);
}

// ---- Tài liệu hồ sơ: tải FILE lên (thay cho gõ tay) ----
export async function uploadCaseDocument(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireCap("case.clinical");
  const caseId = String(formData.get("caseId") ?? "");
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!caseId) return { error: "Thiếu hồ sơ." };
  if (!title) return { error: "Vui lòng nhập tên giấy tờ." };
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn tệp." };
  if (file.size > 15 * 1024 * 1024) return { error: "Tệp tối đa 15MB." };
  if (!isAllowedDocMime(file.type)) return { error: "Định dạng không hỗ trợ (chỉ PDF, ảnh JPG/PNG, Word, Excel)." };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isDocumentBufferValid(buffer, file.type)) return { error: "Nội dung tệp không khớp định dạng đã chọn." };

  const storageError = getUploadStorageError();
  if (storageError) return { error: storageError };
  const fname = safeStoredName(caseId, docExt(file.type, file.name));
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fname), buffer);

  try {
    await prisma.$transaction(async (tx) => {
      const document = await tx.caseDocument.create({
        data: { caseId, title, fileName: file.name.slice(0, 200), url: `/media/${fname}`, mime: file.type, uploadedById: user.id },
      });
      await auditRequired(tx, user.id, "UPLOAD_DOCUMENT", { entity: "CaseDocument", entityId: document.id, meta: { caseId, title } });
    });
  } catch {
    await fs.rm(path.join(dir, fname), { force: true }).catch(() => {});
    return { error: "Không thể lưu giấy tờ lúc này. Vui lòng thử lại." };
  }
  return { ok: true, nonce: Date.now() };
}

export async function deleteCaseDocument(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;
  await withCaseLock(caseId, async (tx) => {
    const deleted = await tx.caseDocument.deleteMany({ where: { id, caseId } });
    if (deleted.count > 0) await auditRequired(tx, user.id, "DELETE_DOCUMENT", { entity: "CaseDocument", entityId: id, meta: { caseId } });
  });
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
  if (!(await hasCaseAccess(user, caseId, "clinical"))) return { error: CASE_ACCESS_MSG };
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

  const owner = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { customerId: true } });
  if (!owner || owner.customerId !== d.customerId) return { error: CASE_ACCESS_MSG };

  await withCaseLock(d.caseId, async (tx) => {
    const lockedOwner = await tx.caseRecord.findUnique({ where: { id: d.caseId }, select: { customerId: true } });
    if (!lockedOwner || lockedOwner.customerId !== d.customerId) throw new Error(CASE_ACCESS_MSG);
    const followUp = await tx.followUp.create({
      data: { caseId: d.caseId, customerId: d.customerId, scheduledAt: when, note: d.note || null, createdById: user.id },
    });
    await auditRequired(tx, user.id, "CREATE_FOLLOW_UP", {
      entity: "FollowUp",
      entityId: followUp.id,
      meta: { caseId: d.caseId, customerId: d.customerId, scheduledAt: when.toISOString() },
    });
  });
  return { ok: true, nonce: Date.now() };
}

// ---- Xóa thanh toán (quản trị / quản lý) ----
export async function deletePayment(formData: FormData): Promise<void> {
  const user = await requireCap("payment.manage");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "payment.manage")) || (await isLockedFor(caseId, user.role))) return;
  const pay = await prisma.payment.findFirst({ where: { id, caseId }, select: { amount: true } });
  if (!pay) return;
  await withCaseLock(caseId, async (tx) => {
    const deleted = await tx.payment.deleteMany({ where: { id, caseId } });
    if (deleted.count === 0) return;
    await recalc(caseId, tx);
    await auditRequired(tx, user.id, "DELETE_PAYMENT", { entity: "Payment", entityId: id, meta: { amount: toNum(pay.amount), caseId } });
  });
  refresh(caseId);
}

// ---- Xác nhận khách đã đến tái khám (vai trò như đón tiếp lịch hẹn thường) ----
export async function markFollowUpArrived(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"]);
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "read")) || (await isLockedFor(caseId, user.role))) return;
  await withCaseLock(caseId, async (tx) => {
    const updated = await tx.followUp.updateMany({ where: { id, caseId }, data: { status: "ARRIVED", doneAt: new Date() } });
    if (updated.count > 0) {
      await auditRequired(tx, user.id, "MARK_FOLLOW_UP_ARRIVED", { entity: "FollowUp", entityId: id, meta: { caseId } });
    }
  });
  refresh(caseId);
}

// ---- Xóa lịch tái khám ----
export async function deleteFollowUp(formData: FormData): Promise<void> {
  const user = await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || !caseId || !(await hasCaseAccess(user, caseId, "clinical")) || (await isLockedFor(caseId, user.role))) return;
  await withCaseLock(caseId, async (tx) => {
    const deleted = await tx.followUp.deleteMany({ where: { id, caseId } });
    if (deleted.count > 0) {
      await auditRequired(tx, user.id, "DELETE_FOLLOW_UP", { entity: "FollowUp", entityId: id, meta: { caseId } });
    }
  });
  refresh(caseId);
}

// ---- Xóa cả hồ sơ điều trị (CHỈ quản trị viên) ----
export async function deleteCase(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const rec = await prisma.caseRecord.findUnique({ where: { id }, select: { customerId: true } });
  if (!rec) return;
  // Dịch vụ/thanh toán/vật tư/tái khám tự xóa theo (onDelete: Cascade); ảnh giữ lại cho khách.
  // Vật tư đã dùng phải hoàn kho TRƯỚC khi cascade xóa MaterialUsage, nếu không tồn kho
  // bị trừ vĩnh viễn dù hồ sơ không còn tồn tại (xem restoreMaterialUsageStock()).
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CaseRecord" WHERE id = ${id} FOR UPDATE`;
    const usages = await tx.materialUsage.findMany({ where: { caseId: id }, select: { materialId: true, quantity: true } });
    await restoreMaterialUsageStock(tx, usages, user.id, "Hoàn kho (xóa hồ sơ)");
    await tx.photo.updateMany({ where: { caseId: id }, data: { caseId: null } });
    const deleted = await tx.caseRecord.deleteMany({ where: { id } });
    if (deleted.count === 0) return;
    await auditRequired(tx, user.id, "DELETE_CASE", { entity: "CaseRecord", entityId: id, meta: { customerId: rec.customerId } });
  });
  if (rec?.customerId) revalidatePath(`/khach-hang/${rec.customerId}`);
  revalidatePath("/ho-so");
  revalidatePath("/dashboard");
  redirect(rec?.customerId ? `/khach-hang/${rec.customerId}` : "/ho-so");
}
