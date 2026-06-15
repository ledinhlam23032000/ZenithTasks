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
  defaultPrice: z.coerce.number().min(0, "Giá không hợp lệ.").default(0),
});

export async function createService(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const parsed = serviceSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    defaultPrice: formData.get("defaultPrice") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.service.create({
    data: { name: parsed.data.name, category: parsed.data.category || null, defaultPrice: parsed.data.defaultPrice },
  });
  revalidatePath("/danh-muc");
  return { ok: true };
}

const materialSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư."),
  unit: z.string().trim().min(1, "Nhập đơn vị.").default("cái"),
});

export async function createMaterial(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const parsed = materialSchema.safeParse({
    name: formData.get("name") ?? "",
    unit: formData.get("unit") ?? "cái",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.material.create({ data: parsed.data });
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
  const parsed = serviceSchema.safeParse({
    name: formData.get("name") ?? "",
    category: formData.get("category") ?? "",
    defaultPrice: formData.get("defaultPrice") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.service
    .update({ where: { id }, data: { name: parsed.data.name, category: parsed.data.category || null, defaultPrice: parsed.data.defaultPrice } })
    .catch(() => {});
  revalidatePath("/danh-muc");
  return { ok: true };
}

export async function updateMaterial(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu vật tư." };
  const parsed = materialSchema.safeParse({ name: formData.get("name") ?? "", unit: formData.get("unit") ?? "cái" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.material.update({ where: { id }, data: { name: parsed.data.name, unit: parsed.data.unit } }).catch(() => {});
  revalidatePath("/danh-muc");
  return { ok: true };
}
