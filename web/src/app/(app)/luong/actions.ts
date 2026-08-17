"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { isMonthClosed } from "@/lib/accounting";

/**
 * Lưu lương cho một nhân sự trong tháng: lương cứng + hoa hồng tự động theo
 * tiền thực thu + điều chỉnh hoa hồng/thưởng nóng/điều chỉnh nhập tay.
 */
export async function savePayroll(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!id || !/^\d{4}-\d{2}$/.test(month)) return;
  // Tháng đã chốt sổ thì không cho sửa lương nữa (mở lại ở trang Kế toán).
  if (await isMonthClosed(month)) return;

  const base = Math.max(0, Math.round(Number(formData.get("baseSalary") ?? 0) || 0));
  const commissionOverride = Math.max(0, Math.round(Number(formData.get("commissionOverride") ?? formData.get("commission") ?? 0) || 0));
  const bonus = Math.max(0, Math.round(Number(formData.get("bonus") ?? 0) || 0));
  const adjustment = Math.round(Number(formData.get("adjustment") ?? 0) || 0);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { baseSalary: base } });
    await tx.payrollEntry.upsert({
      where: { userId_month: { userId: id, month } },
      create: { userId: id, month, commission: 0, commissionOverride: commissionOverride || null, bonus, adjustment },
      update: { commissionOverride: commissionOverride || null, bonus, adjustment },
    });
    await auditRequired(tx, user.id, "SAVE_PAYROLL", { entity: "PayrollEntry", entityId: id, meta: { month } });
  });
}

export type BulkPayrollState = { ok?: boolean; error?: string };

const bulkRowSchema = z.object({
  id: z.string().min(1),
  commissionOverride: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  bonus: z.number().min(0),
  adjustment: z.number(),
});

/** Sửa nhanh hoa hồng/thưởng/điều chỉnh cho NHIỀU nhân sự cùng lúc — lưu 1 lần thay vì mở modal từng người. */
export async function saveBulkPayroll(_prev: BulkPayrollState, formData: FormData): Promise<BulkPayrollState> {
  const user = await requireUser(["ADMIN"]);
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Tháng không hợp lệ." };
  // Tháng đã chốt sổ thì khóa luôn cả đường "sửa nhanh cả bảng" (không chỉ modal từng người).
  if (await isMonthClosed(month)) {
    return { error: `Tháng ${month} đã chốt sổ nên không sửa lương được. Vào trang Kế toán để mở lại sổ nếu cần.` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Dữ liệu không hợp lệ." };
  }
  const parsed = z.array(bulkRowSchema).safeParse(raw);
  if (!parsed.success) return { error: "Dữ liệu không hợp lệ." };
  if (parsed.data.length === 0) return { ok: true };

  await prisma.$transaction(async (tx) => {
    for (const r of parsed.data) {
      const override = r.commissionOverride ?? r.commission ?? 0;
      await tx.payrollEntry.upsert({
        where: { userId_month: { userId: r.id, month } },
        create: { userId: r.id, month, commission: 0, commissionOverride: override || null, bonus: r.bonus, adjustment: r.adjustment },
        update: { commissionOverride: override || null, bonus: r.bonus, adjustment: r.adjustment },
      });
    }
    await auditRequired(tx, user.id, "BULK_SAVE_PAYROLL", { entity: "PayrollEntry", meta: { month, count: parsed.data.length } });
  });
  return { ok: true };
}
