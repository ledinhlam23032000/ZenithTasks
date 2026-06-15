"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";

export type PasswordState = { ok?: boolean; error?: string };
export type ProfileState = { ok?: boolean; error?: string; nonce?: number };

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().optional(),
});

/** Nhân viên tự cập nhật thông tin cá nhân (họ tên, SĐT nội bộ). */
export async function updateMyProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  await prisma.user.update({
    where: { id: user.id },
    data: { fullName: parsed.data.fullName, phone: parsed.data.phone || null },
  });
  revalidatePath("/tai-khoan");
  revalidatePath("/", "layout");
  return { ok: true, nonce: Date.now() };
}

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_EXT = ["jpg", "jpeg", "png", "webp"];

/** Nhân viên tự đổi ảnh đại diện. */
export async function updateMyAvatar(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn ảnh." };
  if (file.size > 4 * 1024 * 1024) return { error: "Ảnh đại diện tối đa 4MB." };
  if (!AVATAR_TYPES.includes(file.type)) return { error: "Chỉ nhận ảnh JPG, PNG hoặc WEBP." };

  const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = AVATAR_EXT.includes(rawExt) ? rawExt : "jpg";
  const fname = `avatar-${user.id}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()));

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: `/uploads/avatars/${fname}` } });
  revalidatePath("/tai-khoan");
  revalidatePath("/", "layout");
  return { ok: true, nonce: Date.now() };
}

const changeSchema = z
  .object({
    current: z.string().min(1, "Nhập mật khẩu hiện tại."),
    next: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự."),
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
  if (next.length < 8) return { error: "Mật khẩu mới tối thiểu 8 ký tự." };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "Không tìm thấy nhân viên." };

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await prisma.auditLog
    .create({ data: { actorId: admin.id, action: "RESET_PASSWORD", entity: "User", entityId: userId } })
    .catch(() => {});
  revalidatePath("/nhan-su");
  return { ok: true };
}
