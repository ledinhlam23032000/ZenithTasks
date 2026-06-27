"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toNum } from "@/lib/money";
import { weightedAvgCost } from "@/lib/inventory-cost";

export type CatalogState = { ok?: boolean; error?: string };
const ROLES = ["ADMIN", "MANAGER"] as const;

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên dịch vụ."),
  category: z.string().trim().optional(),
  listPrice: z.coerce.number().min(0, "Giá không hợp lệ.").default(0),
  defaultPrice: z.coerce.number().min(0, "Giá không hợp lệ.").default(0),
});

function parseService(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    listPrice: formData.get("listPrice") ?? 0,
    defaultPrice: formData.get("defaultPrice") ?? 0,
  });
}

export async function createService(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const parsed = parseService(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  // Giá niêm yết để trống → mặc định = giá ưu đãi (không tạo "tiết kiệm" ảo).
  const listPrice = d.listPrice > 0 ? d.listPrice : d.defaultPrice;
  await prisma.service.create({
    data: { name: d.name, category: d.category || null, listPrice, defaultPrice: d.defaultPrice },
  });
  return { ok: true };
}

const materialSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư."),
  unit: z.string().trim().min(1, "Nhập đơn vị.").default("cái"),
  minStock: z.coerce.number().min(0).default(0),
  lotNo: z.string().trim().optional(),
  expiryDate: z.string().trim().optional(), // yyyy-MM-dd
});

function toDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMaterial(formData: FormData) {
  return materialSchema.safeParse({
    name: formData.get("name") ?? "",
    unit: formData.get("unit") ?? "cái",
    minStock: formData.get("minStock") ?? 0,
    lotNo: formData.get("lotNo") ?? "",
    expiryDate: formData.get("expiryDate") ?? "",
  });
}

export async function createMaterial(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const parsed = parseMaterial(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  await prisma.material.create({
    data: { name: d.name, unit: d.unit, minStock: d.minStock, lotNo: d.lotNo || null, expiryDate: toDate(d.expiryDate) },
  });
  return { ok: true };
}

export async function toggleService(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const s = await prisma.service.findUnique({ where: { id }, select: { active: true } });
  if (!s) return;
  await prisma.service.update({ where: { id }, data: { active: !s.active } });
  revalidatePath("/danh-muc");
}

export async function toggleMaterial(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const m = await prisma.material.findUnique({ where: { id }, select: { active: true } });
  if (!m) return;
  await prisma.material.update({ where: { id }, data: { active: !m.active } });
  revalidatePath("/danh-muc");
}

export async function deleteService(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.service.delete({ where: { id } }).catch(() => {});
  revalidatePath("/danh-muc");
}

export async function deleteMaterial(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.material.delete({ where: { id } }).catch(() => {});
  revalidatePath("/danh-muc");
}

/** Nhập kho: cộng tồn kho + cập nhật giá vốn bình quân + ghi nhật ký nhập. */
export async function stockIn(formData: FormData): Promise<void> {
  const user = await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const qty = Number(formData.get("quantity") ?? 0) || 0;
  const unitCost = Number(formData.get("unitCost") ?? 0) || 0; // đơn giá nhập (VND/đơn vị), tùy chọn
  const note = String(formData.get("note") ?? "").trim();
  if (!id || qty <= 0) return;
  await prisma.$transaction(async (tx) => {
    const m = await tx.material.findUnique({ where: { id }, select: { stock: true, avgCost: true } });
    if (!m) return;
    const newAvg = weightedAvgCost({
      oldStock: toNum(m.stock),
      oldAvg: toNum(m.avgCost),
      inQty: qty,
      inUnitCost: unitCost,
    });
    await tx.material.update({ where: { id }, data: { stock: { increment: qty }, avgCost: newAvg } });
    await tx.stockMovement.create({
      data: {
        materialId: id,
        type: "IN",
        quantity: qty,
        unitCost: unitCost > 0 ? unitCost : null,
        note: note || null,
        createdById: user.id,
      },
    });
  });
  revalidatePath("/danh-muc");
  revalidatePath("/kho");
}

export async function updateService(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu dịch vụ." };
  const parsed = parseService(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const listPrice = d.listPrice > 0 ? d.listPrice : d.defaultPrice;
  await prisma.service
    .update({ where: { id }, data: { name: d.name, category: d.category || null, listPrice, defaultPrice: d.defaultPrice } })
    .catch(() => {});
  return { ok: true };
}

export async function updateMaterial(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu vật tư." };
  const parsed = parseMaterial(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  await prisma.material
    .update({
      where: { id },
      data: { name: d.name, unit: d.unit, minStock: d.minStock, lotNo: d.lotNo || null, expiryDate: toDate(d.expiryDate) },
    })
    .catch(() => {});
  return { ok: true };
}

// ============================================================================
// ĐỊNH MỨC VẬT TƯ THEO DỊCH VỤ (BOM — B5 giai đoạn 2)
// ============================================================================

const bomSchema = z.object({
  serviceId: z.string().min(1, "Thiếu dịch vụ."),
  materialId: z.string().min(1, "Vui lòng chọn vật tư."),
  quantity: z.coerce.number().positive("Định mức phải lớn hơn 0."),
});

/** Thêm/cập nhật một dòng định mức vật tư cho dịch vụ (upsert theo [serviceId, materialId]). */
export async function addServiceMaterial(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const parsed = bomSchema.safeParse({
    serviceId: formData.get("serviceId") ?? "",
    materialId: formData.get("materialId") ?? "",
    quantity: formData.get("quantity") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  // Chốt vật tư còn tồn tại trong danh mục (tránh FK lỗi nếu vừa bị xóa).
  const mat = await prisma.material.findUnique({ where: { id: d.materialId }, select: { id: true } });
  if (!mat) return { error: "Vật tư không còn trong danh mục." };
  await prisma.serviceMaterial.upsert({
    where: { serviceId_materialId: { serviceId: d.serviceId, materialId: d.materialId } },
    create: { serviceId: d.serviceId, materialId: d.materialId, quantity: d.quantity },
    update: { quantity: d.quantity },
  });
  revalidatePath("/danh-muc");
  return { ok: true };
}

/** Xóa một dòng định mức khỏi dịch vụ. */
export async function removeServiceMaterial(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.serviceMaterial.delete({ where: { id } }).catch(() => {});
  revalidatePath("/danh-muc");
}
