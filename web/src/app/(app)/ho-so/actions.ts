"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toNum } from "@/lib/money";

export type CaseActionState = { ok?: boolean; error?: string; nonce?: number };

const CLINICAL = ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR"] as const;

const LOCKED_MSG = "Hồ sơ đã khóa — không thể chỉnh sửa. Vui lòng liên hệ quản trị viên để mở lại.";

/** Hồ sơ đã khóa thì chỉ ADMIN mới được sửa. */
async function isLockedFor(caseId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return false;
  const c = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { locked: true } });
  return !!c?.locked;
}

/** Tính lại tổng tiền / đã trả / công nợ / hoa hồng cho hồ sơ. */
async function recalc(caseId: string): Promise<void> {
  const [services, payAgg, rec] = await Promise.all([
    prisma.caseService.findMany({ where: { caseId }, select: { finalPrice: true, discount: true } }),
    prisma.payment.aggregate({ where: { caseId }, _sum: { amount: true } }),
    prisma.caseRecord.findUnique({ where: { id: caseId }, select: { commissionRate: true } }),
  ]);
  const total = services.reduce((s, x) => s + toNum(x.finalPrice), 0);
  const discount = services.reduce((s, x) => s + toNum(x.discount), 0);
  const paid = toNum(payAgg._sum.amount);
  const debt = Math.max(total - paid, 0);
  const rate = toNum(rec?.commissionRate);
  const commissionAmount = Math.round((total * rate) / 100);
  await prisma.caseRecord.update({
    where: { id: caseId },
    data: { totalAmount: total, discountAmount: discount, paidAmount: paid, debtAmount: debt, commissionAmount },
  });
}

function refresh(caseId: string, customerId?: string) {
  revalidatePath(`/ho-so/${caseId}`);
  revalidatePath("/ho-so");
  revalidatePath("/dashboard");
  if (customerId) revalidatePath(`/khach-hang/${customerId}`);
}

// ---- Khóa / mở khóa hồ sơ ----
export async function lockCase(formData: FormData): Promise<void> {
  const user = await requireUser([...CLINICAL]);
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
  commissionRate: z.coerce.number().min(0, "Hoa hồng không hợp lệ.").max(100, "Hoa hồng tối đa 100%.").default(0),
  chiefComplaint: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function updateCaseInfo(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireUser([...CLINICAL]);
  const caseId = String(formData.get("caseId") ?? "");
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = infoSchema.safeParse({
    caseId,
    consultantId: formData.get("consultantId") ?? "",
    doctorId: formData.get("doctorId") ?? "",
    status: formData.get("status") ?? "OPEN",
    consultResult: formData.get("consultResult") ?? "PENDING",
    commissionRate: formData.get("commissionRate") ?? 0,
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
      commissionRate: d.commissionRate,
      chiefComplaint: d.chiefComplaint || null,
      note: d.note || null,
      completedAt: d.status === "COMPLETED" ? new Date() : null,
    },
  });
  await recalc(d.caseId); // cập nhật lại tiền hoa hồng theo tỉ lệ mới
  refresh(d.caseId);
  return { ok: true, nonce: Date.now() };
}

// ---- Thêm dịch vụ vào hồ sơ ----
const serviceSchema = z.object({
  caseId: z.string().min(1),
  serviceId: z.string().optional(),
  name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ."),
  unitPrice: z.coerce.number().min(0, "Đơn giá không hợp lệ."),
  quantity: z.coerce.number().int().min(1).default(1),
  discount: z.coerce.number().min(0).default(0),
});

export async function addCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireUser([...CLINICAL]);
  const caseId = String(formData.get("caseId") ?? "");
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = serviceSchema.safeParse({
    caseId,
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name") ?? "",
    unitPrice: formData.get("unitPrice") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    discount: formData.get("discount") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const finalPrice = Math.max(d.unitPrice * d.quantity - d.discount, 0);

  const c = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { doctorId: true } });
  await prisma.caseService.create({
    data: {
      caseId: d.caseId,
      serviceId: d.serviceId || null,
      name: d.name,
      unitPrice: d.unitPrice,
      quantity: d.quantity,
      discount: d.discount,
      finalPrice,
      doctorId: c?.doctorId ?? null,
    },
  });
  await recalc(d.caseId);
  refresh(d.caseId);
  return { ok: true, nonce: Date.now() };
}

export async function removeCaseService(formData: FormData): Promise<void> {
  const user = await requireUser([...CLINICAL]);
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.caseService.delete({ where: { id } }).catch(() => {});
  if (caseId) {
    await recalc(caseId);
    refresh(caseId);
  }
}

// ---- Sửa dịch vụ trong hồ sơ ----
const serviceEditSchema = serviceSchema.extend({ id: z.string().min(1) });

export async function updateCaseService(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireUser([...CLINICAL]);
  const caseId = String(formData.get("caseId") ?? "");
  if (await isLockedFor(caseId, user.role)) return { error: LOCKED_MSG };

  const parsed = serviceEditSchema.safeParse({
    id: formData.get("id") ?? "",
    caseId,
    serviceId: formData.get("serviceId") ?? "",
    name: formData.get("name") ?? "",
    unitPrice: formData.get("unitPrice") ?? 0,
    quantity: formData.get("quantity") ?? 1,
    discount: formData.get("discount") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const finalPrice = Math.max(d.unitPrice * d.quantity - d.discount, 0);

  await prisma.caseService.update({
    where: { id: d.id },
    data: { name: d.name, unitPrice: d.unitPrice, quantity: d.quantity, discount: d.discount, finalPrice },
  });
  await recalc(d.caseId);
  refresh(d.caseId);
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
  const user = await requireUser([...CLINICAL, "RECEPTION"]);
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
  await prisma.payment.create({
    data: { caseId: d.caseId, amount: d.amount, method: d.method, note: d.note || null, receivedById: user.id },
  });
  await recalc(d.caseId);
  refresh(d.caseId);
  return { ok: true, nonce: Date.now() };
}

// ---- Sửa thanh toán (chỉ quản trị / quản lý — liên quan tiền) ----
const paymentEditSchema = paymentSchema.extend({ id: z.string().min(1) });

export async function updatePayment(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireUser(["ADMIN", "MANAGER"]);
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

  await prisma.payment.update({
    where: { id: d.id },
    data: { amount: d.amount, method: d.method, note: d.note || null },
  });
  await recalc(d.caseId);
  refresh(d.caseId);
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
  const user = await requireUser([...CLINICAL]);
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
  refresh(d.caseId);
  return { ok: true, nonce: Date.now() };
}

export async function removeMaterial(formData: FormData): Promise<void> {
  const user = await requireUser([...CLINICAL]);
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  const usage = await prisma.materialUsage.findUnique({ where: { id }, select: { materialId: true, quantity: true } });
  await prisma.materialUsage.delete({ where: { id } }).catch(() => {});
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
  const user = await requireUser([...CLINICAL]);
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
  refresh(d.caseId);
  return { ok: true, nonce: Date.now() };
}

// ---- Tải ảnh trước / sau / tái khám ----
// KHÔNG nhận SVG (có thể chứa mã độc) — chỉ ảnh bitmap an toàn.
const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function uploadPhoto(_prev: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const user = await requireUser([...CLINICAL]);
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
      type: type as "BEFORE" | "AFTER" | "FOLLOW_UP",
      url: `/uploads/${fname}`,
      caption: caption || null,
      followUpIndex,
      uploadedById: user.id,
    },
  });
  refresh(caseId, customerId);
  return { ok: true, nonce: Date.now() };
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const user = await requireUser([...CLINICAL]);
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
  const user = await requireUser([...CLINICAL]);
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
  refresh(d.caseId, d.customerId);
  return { ok: true, nonce: Date.now() };
}

// ---- Xóa thanh toán (quản trị / quản lý) ----
export async function deletePayment(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.payment.delete({ where: { id } }).catch(() => {});
  if (caseId) {
    await recalc(caseId);
    refresh(caseId);
  }
}

// ---- Xóa lịch tái khám ----
export async function deleteFollowUp(formData: FormData): Promise<void> {
  const user = await requireUser([...CLINICAL]);
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id || (await isLockedFor(caseId, user.role))) return;
  await prisma.followUp.delete({ where: { id } }).catch(() => {});
  if (caseId) refresh(caseId);
}

// ---- Xóa cả hồ sơ điều trị (CHỈ quản trị viên) ----
export async function deleteCase(formData: FormData): Promise<void> {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const rec = await prisma.caseRecord.findUnique({ where: { id }, select: { customerId: true } });
  // Dịch vụ/thanh toán/vật tư/tái khám tự xóa theo (onDelete: Cascade); ảnh giữ lại cho khách.
  await prisma.photo.updateMany({ where: { caseId: id }, data: { caseId: null } });
  await prisma.caseRecord.delete({ where: { id } }).catch(() => {});
  if (rec?.customerId) revalidatePath(`/khach-hang/${rec.customerId}`);
  revalidatePath("/ho-so");
  revalidatePath("/dashboard");
  redirect(rec?.customerId ? `/khach-hang/${rec.customerId}` : "/ho-so");
}
