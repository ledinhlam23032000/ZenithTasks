"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { totpVerify } from "@/lib/totp";
import { checkLoginAllowed, registerLoginFailure, clearLoginFailures } from "@/lib/rate-limit";

export type LoginState = { error?: string };

// Mật khẩu chung gán cho MỌI tài khoản khi seed dữ liệu mẫu (xem prisma/seed.ts).
// Đăng nhập bằng đúng chuỗi này → phiên được đánh dấu "mật khẩu yếu" để cảnh báo
// đổi ngay (banner ở AppShell) — phòng khi phòng khám lên thật mà quên đổi.
const DEMO_PASSWORD = "123456";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  return ip.trim();
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };
  }

  const ip = await clientIp();
  const uname = parsed.data.username.toLowerCase();

  // Chặn dò mật khẩu: nếu sai quá nhiều lần thì tạm khoá.
  const gate = checkLoginAllowed(ip, uname);
  if (!gate.ok) {
    const mins = Math.ceil((gate.retryAfterSec ?? 0) / 60);
    return { error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${mins} phút.` };
  }

  // Tìm tài khoản KHÔNG phân biệt hoa/thường (tránh lỗi gõ "Letan" vs "letan").
  const user = await prisma.user.findFirst({
    where: { username: { equals: parsed.data.username, mode: "insensitive" } },
  });
  if (!user || !user.active) {
    registerLoginFailure(ip, uname);
    return { error: "Tài khoản không tồn tại hoặc đã bị khoá." };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    registerLoginFailure(ip, uname);
    return { error: "Sai mật khẩu. Vui lòng thử lại." };
  }

  // Xác thực 2 lớp (chỉ với tài khoản đã bật) — không ảnh hưởng tài khoản chưa bật.
  if (user.totpEnabled) {
    const code = String(formData.get("code") ?? "");
    if (!user.totpSecret || !totpVerify(user.totpSecret, code)) {
      registerLoginFailure(ip, uname);
      return { error: code ? "Mã xác thực 2 lớp không đúng." : "Vui lòng nhập mã xác thực 2 lớp (6 số)." };
    }
  }

  clearLoginFailures(ip, uname);
  await createSession({ uid: user.id, role: user.role, name: user.fullName, weakPw: parsed.data.password === DEMO_PASSWORD });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "LOGIN", ip } }).catch(() => {});

  redirect("/dashboard");
}
