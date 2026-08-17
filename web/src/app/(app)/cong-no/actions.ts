"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { auditRequired } from "@/lib/audit";
import { clampDayOfMonth } from "@/lib/debt-plan";
import { DEBT_THRESHOLD_KEY } from "@/lib/settings";
import { canAccessCase } from "@/lib/case-access";
import { loadCaseFinancials } from "@/lib/financial-summary-db";

export type DebtPlanState = { ok?: boolean; error?: string; nonce?: number };

/**
 * Lưu ngưỡng cảnh báo công nợ (dùng chung toàn hệ thống, lưu ở DB nên KHÔNG mất
 * khi rời trang / đổi máy). Cặp với `useFormAction` → KHÔNG gọi revalidatePath.
 */
export async function saveDebtThreshold(_prev: DebtPlanState, formData: FormData): Promise<DebtPlanState> {
  const user = await requireCap("mod:cong-no");
  if (isShareholder(user.role)) return { error: "Bạn chỉ có quyền xem, không đổi được ngưỡng." };
  const n = Number(formData.get("threshold"));
  if (!Number.isFinite(n) || n < 0) return { error: "Ngưỡng không hợp lệ." };
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { key: DEBT_THRESHOLD_KEY },
      create: { key: DEBT_THRESHOLD_KEY, value: String(Math.round(n)) },
      update: { value: String(Math.round(n)) },
    });
    await auditRequired(tx, user.id, "SET_DEBT_THRESHOLD", {
      entity: "AppSetting",
      entityId: DEBT_THRESHOLD_KEY,
      meta: { value: Math.round(n) },
    });
  });
  return { ok: true, nonce: Date.now() };
}

const schema = z.object({
  caseId: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1, "Ngày trả từ 1–31.").max(31, "Ngày trả từ 1–31."),
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
  const rec = await prisma.caseRecord.findUnique({ where: { id: d.caseId }, select: { id: true, consultantId: true, doctorId: true } });
  if (!rec) return { error: "Không tìm thấy hồ sơ." };
  if (!canAccessCase(user, rec, "payment.add")) return { error: "Bạn không có quyền thao tác trên hồ sơ này." };
  const currentDebt = (await loadCaseFinancials([d.caseId])).get(d.caseId)?.debt ?? 0;
  if (currentDebt <= 0) return { error: "Hồ sơ hiện không còn công nợ để lập kế hoạch." };

  const dayOfMonth = clampDayOfMonth(d.dayOfMonth);
  const startDate = d.startDate ? new Date(d.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) return { error: "Ngày bắt đầu không hợp lệ." };

  await prisma.$transaction(async (tx) => {
    await tx.debtPlan.upsert({
      where: { caseId: d.caseId },
      create: { caseId: d.caseId, dayOfMonth, monthlyAmount: d.monthlyAmount, startDate, note: d.note || null, createdById: user.id },
      update: { dayOfMonth, monthlyAmount: d.monthlyAmount, startDate, note: d.note || null },
    });
    await auditRequired(tx, user.id, "SAVE_DEBT_PLAN", {
      entity: "DebtPlan",
      entityId: d.caseId,
      meta: { dayOfMonth, monthlyAmount: d.monthlyAmount },
    });
  });

  return { ok: true, nonce: Date.now() };
}

/** Hủy kế hoạch trả nợ (dùng với ConfirmButton — revalidate trực tiếp). */
export async function deleteDebtPlan(formData: FormData): Promise<void> {
  const user = await requireCap("payment.add");
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;
  const rec = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { consultantId: true, doctorId: true } });
  if (!rec || !canAccessCase(user, rec, "payment.add")) return;
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.debtPlan.deleteMany({ where: { caseId } });
    if (deleted.count > 0) {
      await auditRequired(tx, user.id, "DELETE_DEBT_PLAN", { entity: "DebtPlan", entityId: caseId });
    }
  });
  revalidatePath(`/ho-so/${caseId}`);
  revalidatePath("/cong-no");
}
