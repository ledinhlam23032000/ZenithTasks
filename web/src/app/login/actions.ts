"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export type LoginState = { error?: string };

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.active) {
    return { error: "Tài khoản không tồn tại hoặc đã bị khoá." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return { error: "Sai mật khẩu. Vui lòng thử lại." };
  }

  await createSession({ uid: user.id, role: user.role, name: user.fullName });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "LOGIN" } }).catch(() => {});

  redirect("/dashboard");
}
