"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * Lưu lương cho một nhân sự trong tháng: lương cứng (cố định theo người) +
 * thưởng nóng / điều chỉnh / số ca điều dưỡng (theo từng tháng).
 */
export async function savePayroll(formData: FormData): Promise<void> {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!id || !/^\d{4}-\d{2}$/.test(month)) return;

  const base = Math.max(0, Math.round(Number(formData.get("baseSalary") ?? 0) || 0));
  const bonus = Math.max(0, Math.round(Number(formData.get("bonus") ?? 0) || 0));
  const adjustment = Math.round(Number(formData.get("adjustment") ?? 0) || 0);
  const nurseCases = Math.max(0, Math.round(Number(formData.get("nurseCases") ?? 0) || 0));

  await prisma.user.update({ where: { id }, data: { baseSalary: base } });
  await prisma.payrollEntry.upsert({
    where: { userId_month: { userId: id, month } },
    create: { userId: id, month, bonus, adjustment, nurseCases },
    update: { bonus, adjustment, nurseCases },
  });
  revalidatePath("/luong");
}
