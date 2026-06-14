"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { vnDateOnly } from "@/lib/dates";

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
