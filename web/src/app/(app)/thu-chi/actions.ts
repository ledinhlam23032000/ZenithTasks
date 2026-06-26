"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { CATEGORY_LABEL } from "@/lib/finance";

export type CashState = { ok?: boolean; error?: string };

const NO_WRITE = "Bạn chỉ có quyền xem sổ thu chi.";

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "Vui lòng chọn hạng mục.").refine((c) => c in CATEGORY_LABEL, "Hạng mục không hợp lệ."),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
  occurredAt: z.string().min(1, "Vui lòng chọn ngày."),
  method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]).default("CASH"),
  vendor: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    type: formData.get("type") ?? "EXPENSE",
    category: formData.get("category") ?? "",
    amount: formData.get("amount") ?? 0,
    occurredAt: formData.get("occurredAt") ?? "",
    method: formData.get("method") ?? "CASH",
    vendor: formData.get("vendor") ?? "",
    note: formData.get("note") ?? "",
  });
}

export async function createCashTransaction(_prev: CashState, formData: FormData): Promise<CashState> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return { error: NO_WRITE };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const when = new Date(d.occurredAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày không hợp lệ." };

  await prisma.cashTransaction.create({
    data: {
      type: d.type,
      category: d.category,
      amount: Math.round(d.amount),
      occurredAt: when,
      method: d.method,
      vendor: d.vendor || null,
      note: d.note || null,
      createdById: user.id,
    },
  });
  return { ok: true };
}

export async function updateCashTransaction(_prev: CashState, formData: FormData): Promise<CashState> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return { error: NO_WRITE };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã giao dịch." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const when = new Date(d.occurredAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày không hợp lệ." };

  await prisma.cashTransaction.update({
    where: { id },
    data: {
      type: d.type,
      category: d.category,
      amount: Math.round(d.amount),
      occurredAt: when,
      method: d.method,
      vendor: d.vendor || null,
      note: d.note || null,
    },
  });
  return { ok: true };
}

export async function deleteCashTransaction(formData: FormData): Promise<void> {
  const user = await requireCap("mod:thu-chi");
  if (isShareholder(user.role)) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.cashTransaction.delete({ where: { id } }).catch(() => {});
  revalidatePath("/thu-chi");
  revalidatePath("/dashboard");
}
