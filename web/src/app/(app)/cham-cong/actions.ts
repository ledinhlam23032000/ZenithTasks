"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { vnDateOnly } from "@/lib/dates";
import { audit } from "@/lib/audit";

export type AttState = { ok?: boolean; error?: string };

/** Nhân viên chấm công VÀO (ngày hôm nay). */
export async function checkIn(): Promise<void> {
  const user = await requireUser();
  const date = vnDateOnly();
  await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, checkInAt: new Date() },
    update: {},
  });
  revalidatePath("/cham-cong");
  revalidatePath("/dashboard");
}

/** Chấm công RA (cập nhật giờ ra cho hôm nay). */
export async function checkOut(): Promise<void> {
  const user = await requireUser();
  const date = vnDateOnly();
  const a = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (a) await prisma.attendance.update({ where: { id: a.id }, data: { checkOutAt: new Date() } });
  revalidatePath("/cham-cong");
}

/** Quản trị xóa một bản ghi chấm công (sửa sai). */
export async function deleteAttendance(formData: FormData): Promise<void> {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.attendance.delete({ where: { id } }).catch(() => {});
  revalidatePath("/cham-cong");
}

/** Ngày (yyyy-MM-dd) → mốc 00:00 UTC để khớp cột @db.Date (giống vnDateOnly). */
function dateOnly(s: string): Date | null {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** Ghép ngày + giờ (theo giờ VN, UTC+7) thành mốc thời gian; hiển thị lại đúng giờ đã nhập. */
function vnDateTime(dateStr: string, timeStr: string): Date | null {
  const d = new Date(`${dateStr}T${timeStr}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const attSchema = z.object({
  userId: z.string().min(1, "Chọn nhân viên."),
  date: z.string().min(1, "Chọn ngày."),
  checkIn: z.string().min(1, "Nhập giờ vào."),
  checkOut: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

/**
 * Quản trị THÊM / SỬA chấm công cho bất kỳ ngày nào (kể cả ngày trước khi có app).
 * Nhập giờ vào / giờ ra theo giờ VN. Upsert theo (nhân viên, ngày).
 */
export async function upsertAttendance(_prev: AttState, formData: FormData): Promise<AttState> {
  const me = await requireUser(["ADMIN", "MANAGER"]);
  const parsed = attSchema.safeParse({
    userId: formData.get("userId") ?? "",
    date: formData.get("date") ?? "",
    checkIn: formData.get("checkIn") ?? "",
    checkOut: formData.get("checkOut") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const date = dateOnly(d.date);
  if (!date) return { error: "Ngày không hợp lệ." };
  const checkInAt = vnDateTime(d.date, d.checkIn);
  if (!checkInAt) return { error: "Giờ vào không hợp lệ." };
  const checkOutAt = d.checkOut ? vnDateTime(d.date, d.checkOut) : null;
  if (d.checkOut && !checkOutAt) return { error: "Giờ ra không hợp lệ." };
  if (checkOutAt && checkOutAt < checkInAt) return { error: "Giờ ra phải sau giờ vào." };

  const target = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true } });
  if (!target) return { error: "Không tìm thấy nhân viên." };

  await prisma.attendance.upsert({
    where: { userId_date: { userId: d.userId, date } },
    create: { userId: d.userId, date, checkInAt, checkOutAt, note: d.note || null },
    update: { checkInAt, checkOutAt, note: d.note || null },
  });
  await audit(me.id, "EDIT_ATTENDANCE", { entity: "Attendance", meta: { userId: d.userId, date: d.date } });
  return { ok: true };
}
