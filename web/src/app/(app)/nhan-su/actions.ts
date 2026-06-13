"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";

export type StaffFormState = { ok?: boolean; error?: string };

const schema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  username: z
    .string()
    .trim()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự.")
    .regex(/^[a-z0-9_.]+$/i, "Tên đăng nhập chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."),
  role: z.enum(["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"]),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự."),
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

  const existing = await prisma.user.findUnique({ where: { username: d.username.toLowerCase() } });
  if (existing) return { error: "Tên đăng nhập đã tồn tại." };

  const count = await prisma.user.count();
  await prisma.user.create({
    data: {
      code: `NV${String(count + 1).padStart(3, "0")}`,
      fullName: d.fullName,
      username: d.username.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: d.role,
      phone: d.phone || null,
    },
  });

  revalidatePath("/nhan-su");
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
