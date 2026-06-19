"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

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
  revalidatePath("/danh-muc");
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
  revalidatePath("/danh-muc");
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

/** Nhập kho: cộng tồn kho + ghi nhật ký nhập. */
export async function stockIn(formData: FormData): Promise<void> {
  const user = await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const qty = Number(formData.get("quantity") ?? 0) || 0;
  const note = String(formData.get("note") ?? "").trim();
  if (!id || qty <= 0) return;
  await prisma.$transaction([
    prisma.material.update({ where: { id }, data: { stock: { increment: qty } } }),
    prisma.stockMovement.create({
      data: { materialId: id, type: "IN", quantity: qty, note: note || null, createdById: user.id },
    }),
  ]);
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
  revalidatePath("/danh-muc");
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
  revalidatePath("/danh-muc");
  return { ok: true };
}
