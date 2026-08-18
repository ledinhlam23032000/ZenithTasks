"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { vnDateOnly } from "@/lib/dates";
import { auditRequired } from "@/lib/audit";

export type AttState = { ok?: boolean; error?: string };

const bulkAttSchema = z.object({
  userId: z.string().min(1),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(62),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/),
  checkOut: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().trim().max(500).optional(),
});

/** Nhân viên chấm công VÀO (ngày hôm nay). */
export async function checkIn(): Promise<void> {
  const user = await requireUser();
  const date = vnDateOnly();
  await prisma.$transaction(async (tx) => {
    await tx.attendance.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, checkInAt: new Date() },
      update: {},
    });
    await auditRequired(tx, user.id, "CHECK_IN", { entity: "Attendance", meta: { date: date.toISOString() } });
  });
  revalidatePath("/cham-cong");
  revalidatePath("/dashboard");
}

/** Chấm công RA (cập nhật giờ ra cho hôm nay). */
export async function checkOut(): Promise<void> {
  const user = await requireUser();
  const date = vnDateOnly();
  await prisma.$transaction(async (tx) => {
    const a = await tx.attendance.findUnique({ where: { userId_date: { userId: user.id, date } } });
    if (a) {
      await tx.attendance.update({ where: { id: a.id }, data: { checkOutAt: new Date() } });
      await auditRequired(tx, user.id, "CHECK_OUT", { entity: "Attendance", entityId: a.id, meta: { date: date.toISOString() } });
    }
  });
  revalidatePath("/cham-cong");
}

/** Quản trị xóa một bản ghi chấm công (sửa sai). */
export async function deleteAttendance(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.attendance.deleteMany({ where: { id } });
      if (deleted.count > 0) await auditRequired(tx, user.id, "DELETE_ATTENDANCE", { entity: "Attendance", entityId: id });
    });
  }
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
export async function bulkUpsertAttendance(_prev: AttState, formData: FormData): Promise<AttState> {
  const me = await requireUser(["ADMIN", "MANAGER"]);
  let dates: unknown;
  try { dates = JSON.parse(String(formData.get("dates") ?? "[]")); } catch { dates = []; }
  const parsed = bulkAttSchema.safeParse({
    userId: formData.get("userId") ?? "",
    dates,
    checkIn: formData.get("checkIn") ?? "",
    checkOut: String(formData.get("checkOut") ?? "").trim() || undefined,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu chấm công hàng loạt không hợp lệ." };
  const d = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true, fullName: true } });
  if (!target) return { error: "Không tìm thấy nhân viên." };
  const checkInAt = (date: string) => vnDateTime(date, d.checkIn);
  const checkOutAt = (date: string) => d.checkOut ? vnDateTime(date, d.checkOut) : null;
  const rows = d.dates.map((date) => ({ date, checkInAt: checkInAt(date), checkOutAt: checkOutAt(date) }));
  if (rows.some((row) => !row.checkInAt || (d.checkOut && !row.checkOutAt))) return { error: "Có ngày hoặc giờ chấm công không hợp lệ." };
  if (rows.some((row) => row.checkOutAt && row.checkInAt && row.checkOutAt < row.checkInAt)) return { error: "Giờ ra phải sau giờ vào." };
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const attendance = await tx.attendance.upsert({
        where: { userId_date: { userId: d.userId, date: dateOnly(row.date)! } },
        create: { userId: d.userId, date: dateOnly(row.date)!, checkInAt: row.checkInAt!, checkOutAt: row.checkOutAt, note: d.note || null },
        update: { checkInAt: row.checkInAt!, checkOutAt: row.checkOutAt, note: d.note || null },
      });
      await auditRequired(tx, me.id, "EDIT_ATTENDANCE", { entity: "Attendance", entityId: attendance.id, meta: { userId: d.userId, date: row.date, source: "ASSISTANT_BULK" } });
    }
  });
  revalidatePath("/cham-cong");
  revalidatePath("/luong");
  revalidatePath("/ke-toan");
  return { ok: true };
}

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

  await prisma.$transaction(async (tx) => {
    const attendance = await tx.attendance.upsert({
      where: { userId_date: { userId: d.userId, date } },
      create: { userId: d.userId, date, checkInAt, checkOutAt, note: d.note || null },
      update: { checkInAt, checkOutAt, note: d.note || null },
    });
    await auditRequired(tx, me.id, "EDIT_ATTENDANCE", { entity: "Attendance", entityId: attendance.id, meta: { userId: d.userId, date: d.date } });
  });
  return { ok: true };
}
