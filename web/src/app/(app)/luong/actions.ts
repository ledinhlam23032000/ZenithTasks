"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Quản trị viên đặt lương cơ bản & % hoa hồng cho một nhân sự. */
export async function setStaffSalary(formData: FormData): Promise<void> {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const base = Math.max(0, Math.round(Number(formData.get("baseSalary") ?? 0) || 0));
  const rate = Math.min(100, Math.max(0, Number(formData.get("commissionRate") ?? 0) || 0));
  await prisma.user.update({ where: { id }, data: { baseSalary: base, commissionRate: rate } });
  revalidatePath("/luong");
}
