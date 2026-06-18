"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { diffFromDesired, ALL_PERM_KEYS } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";

export type StaffFormState = { ok?: boolean; error?: string };

const schema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự.")
    .regex(/^[a-z0-9_.]+$/i, "Tên đăng nhập chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."),
  role: z.enum(["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "NURSE", "CARE"]),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự."),
  phone: z.string().trim().optional(),
});

export async function createStaff(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  await requireUser(["ADMIN"]);

  const parsed = schema.safeParse({
    fullName: formData.get("fullName") ?? "",
    username: formData.get("username") ?? "",
    role: formData.get("role") ?? "RECEPTION",
    password: formData.get("password") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;
  const uname = d.username.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { username: { equals: uname, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: "Tên đăng nhập đã tồn tại." };

  // Sinh mã NV KHÔNG trùng (số lớn nhất hiện có + 1) — tránh lỗi sau khi đã xóa tài khoản.
  const users = await prisma.user.findMany({ select: { code: true } });
  let maxN = 0;
  for (const u of users) {
    const m = u.code?.match(/^NV(\d+)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  const code = `NV${String(maxN + 1).padStart(3, "0")}`;

  try {
    await prisma.user.create({
      data: {
        code,
        fullName: d.fullName,
        username: uname,
        passwordHash: await hashPassword(d.password),
        role: d.role,
        phone: d.phone || null,
      },
    });
  } catch {
    return { error: "Không tạo được tài khoản (tên đăng nhập hoặc mã đã tồn tại). Vui lòng thử lại." };
  }

  revalidatePath("/nhan-su");
  return { ok: true };
}

/** Lưu phân quyền tuỳ chỉnh cho một nhân sự (thêm/bớt quyền ngoài mặc định vai trò). */
export async function savePermissions(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Thiếu nhân sự." };
  const keys = formData.getAll("key").map(String).filter((k) => ALL_PERM_KEYS.includes(k));
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { error: "Không tìm thấy nhân sự." };
  const override = diffFromDesired(target.role as Role, keys);
  await prisma.user.update({ where: { id: userId }, data: { permissions: override } });
  revalidatePath("/nhan-su");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleStaffActive(formData: FormData): Promise<void> {
  const me = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return; // không tự khoá chính mình
  const u = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!u) return;
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/nhan-su");
}

/**
 * Xóa vĩnh viễn một nhân sự (CHỈ quản trị viên, không tự xóa mình).
 * Các bản ghi do người này tạo sẽ được giữ lại (trường người tạo chuyển về trống).
 */
export async function deleteStaff(formData: FormData): Promise<void> {
  const me = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) return;
  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { userId: id } }),
    prisma.auditLog.deleteMany({ where: { actorId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
  revalidatePath("/nhan-su");
}
