"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clampDayOfMonth } from "@/lib/debt-plan";

export type DebtPlanState = { ok?: boolean; error?: string; nonce?: number };

const schema = z.object({
  caseId: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1, "Ngày trả từ 1–28.").max(28, "Ngày trả từ 1–28."),
  monthlyAmount: z.coerce.number().positive("Số tiền mỗi tháng phải lớn hơn 0."),
  startDate: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

/**
 * Lập / cập nhật kế hoạch trả nợ cho 1 hồ sơ (mỗi hồ sơ 1 kế hoạch — upsert theo caseId).
 * Cặp với `useFormAction` ở giao diện → KHÔNG gọi revalidatePath (router.refresh lo phần đó).
 */
export async function saveDebtPlan(_prev: DebtPlanState, formData: FormData): Promise<DebtPlanState> {
  const user = await requireCap("payment.add");

  const parsed = schema.safeParse({
    caseId: formData.get("caseId") ?? "",
    dayOfMonth: formData.get("dayOfMonth") ?? "",
    monthlyAmount: formData.get("monthlyAmount") ?? "",
    startDate: formData.get("startDate") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  // Hồ sơ phải tồn tại + còn nợ mới cho lập kế hoạch.
  const rec = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { id: true, debtAmount: true } });
  if (!rec) return { error: "Không tìm thấy hồ sơ." };

  const dayOfMonth = clampDayOfMonth(d.dayOfMonth);
  const startDate = d.startDate ? new Date(d.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) return { error: "Ngày bắt đầu không hợp lệ." };

  await prisma.debtPlan.upsert({
    where: { caseId: d.caseId },
    create: { caseId: d.caseId, dayOfMonth, monthlyAmount: d.monthlyAmount, startDate, note: d.note || null, createdById: user.id },
    update: { dayOfMonth, monthlyAmount: d.monthlyAmount, startDate, note: d.note || null },
  });
  await audit(user.id, "SAVE_DEBT_PLAN", { entity: "DebtPlan", entityId: d.caseId, meta: { dayOfMonth, monthlyAmount: d.monthlyAmount } });

  return { ok: true, nonce: Date.now() };
}

/** Hủy kế hoạch trả nợ (dùng với ConfirmButton — revalidate trực tiếp). */
export async function deleteDebtPlan(formData: FormData): Promise<void> {
  const user = await requireCap("payment.add");
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;
  await prisma.debtPlan.delete({ where: { caseId } }).catch(() => {});
  await audit(user.id, "DELETE_DEBT_PLAN", { entity: "DebtPlan", entityId: caseId });
  revalidatePath(`/ho-so/${caseId}`);
  revalidatePath("/cong-no");
}
