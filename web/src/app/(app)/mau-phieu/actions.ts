"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type TemplateState = { ok?: boolean; error?: string };
const ROLES = ["ADMIN", "MANAGER"] as const;

const schema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên phiếu."),
  body: z.string().trim().min(1, "Vui lòng nhập nội dung phiếu."),
});

export async function createTemplate(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  await requireUser([...ROLES]);
  const parsed = schema.safeParse({ title: formData.get("title") ?? "", body: formData.get("body") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.consentTemplate.create({ data: parsed.data });
  return { ok: true };
}

export async function updateTemplate(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mẫu phiếu." };
  const parsed = schema.safeParse({ title: formData.get("title") ?? "", body: formData.get("body") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  await prisma.consentTemplate.update({ where: { id }, data: parsed.data }).catch(() => {});
  return { ok: true };
}

export async function toggleTemplate(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  const t = await prisma.consentTemplate.findUnique({ where: { id }, select: { active: true } });
  if (!t) return;
  await prisma.consentTemplate.update({ where: { id }, data: { active: !t.active } });
  revalidatePath("/mau-phieu");
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.consentTemplate.delete({ where: { id } }).catch(() => {});
  revalidatePath("/mau-phieu");
}
