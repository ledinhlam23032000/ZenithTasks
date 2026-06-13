"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ShiftFormState = { ok?: boolean; error?: string };

const ROLES = ["ADMIN", "MANAGER"] as const;

const schema = z.object({
  userId: z.string().min(1, "Chọn nhân viên."),
  date: z.string().min(1, "Chọn ngày."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Giờ bắt đầu không hợp lệ."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Giờ kết thúc không hợp lệ."),
  note: z.string().trim().optional(),
});

export async function createShift(_prev: ShiftFormState, formData: FormData): Promise<ShiftFormState> {
  await requireUser([...ROLES]);
  const parsed = schema.safeParse({
    userId: formData.get("userId") ?? "",
    date: formData.get("date") ?? "",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  if (d.endTime <= d.startTime) return { error: "Giờ kết thúc phải sau giờ bắt đầu." };

  const date = new Date(`${d.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { error: "Ngày không hợp lệ." };

  await prisma.shift.create({
    data: { userId: d.userId, date, startTime: d.startTime, endTime: d.endTime, note: d.note || null },
  });
  revalidatePath("/lich-lam-viec");
  return { ok: true };
}

export async function deleteShift(formData: FormData): Promise<void> {
  await requireUser([...ROLES]);
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.shift.delete({ where: { id } }).catch(() => {});
  revalidatePath("/lich-lam-viec");
}
