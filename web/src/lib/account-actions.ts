"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";

export type PasswordState = { ok?: boolean; error?: string };

const changeSchema = z
  .object({
    current: z.string().min(1, "Nhập mật khẩu hiện tại."),
    next: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự."),
    confirm: z.string().min(1, "Xác nhận mật khẩu mới."),
  })
  .refine((d) => d.next === d.confirm, { message: "Xác nhận mật khẩu không khớp.", path: ["confirm"] });

/** Nhân viên tự đổi mật khẩu của mình. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const parsed = changeSchema.safeParse({
    current: formData.get("current") ?? "",
    next: formData.get("next") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record) return { error: "Không tìm thấy tài khoản." };

  const ok = await verifyPassword(parsed.data.current, record.passwordHash);
  if (!ok) return { error: "Mật khẩu hiện tại không đúng." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "CHANGE_PASSWORD" } }).catch(() => {});
  return { ok: true };
}

/** Quản trị viên đặt lại mật khẩu cho một nhân viên. */
export async function resetStaffPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!userId) return { error: "Thiếu nhân viên." };
  if (next.length < 6) return { error: "Mật khẩu mới tối thiểu 6 ký tự." };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "Không tìm thấy nhân viên." };

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await prisma.auditLog
    .create({ data: { actorId: admin.id, action: "RESET_PASSWORD", entity: "User", entityId: userId } })
    .catch(() => {});
  revalidatePath("/nhan-su");
  return { ok: true };
}
