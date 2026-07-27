"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isMonthClosed } from "@/lib/accounting";

/**
 * Lưu lương cho một nhân sự trong tháng: lương cứng (cố định theo người) +
 * hoa hồng / thưởng nóng / điều chỉnh (nhập tay theo từng tháng).
 */
export async function savePayroll(formData: FormData): Promise<void> {
  await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!id || !/^\d{4}-\d{2}$/.test(month)) return;
  // Tháng đã chốt sổ thì không cho sửa lương nữa (mở lại ở trang Kế toán).
  if (await isMonthClosed(month)) return;

  const base = Math.max(0, Math.round(Number(formData.get("baseSalary") ?? 0) || 0));
  const commission = Math.max(0, Math.round(Number(formData.get("commission") ?? 0) || 0));
  const bonus = Math.max(0, Math.round(Number(formData.get("bonus") ?? 0) || 0));
  const adjustment = Math.round(Number(formData.get("adjustment") ?? 0) || 0);

  await prisma.user.update({ where: { id }, data: { baseSalary: base } });
  await prisma.payrollEntry.upsert({
    where: { userId_month: { userId: id, month } },
    create: { userId: id, month, commission, bonus, adjustment },
    update: { commission, bonus, adjustment },
  });
  revalidatePath("/luong");
}
