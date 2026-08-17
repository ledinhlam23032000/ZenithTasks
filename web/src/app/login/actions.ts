"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { totpVerify } from "@/lib/totp";
import { checkLoginAllowed, registerLoginFailure, clearLoginFailures } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/request-client";

export type LoginState = { error?: string };

// Mật khẩu chung gán cho MỌI tài khoản khi seed dữ liệu mẫu (xem prisma/seed.ts).
// Đăng nhập bằng đúng chuỗi này → phiên được đánh dấu "mật khẩu yếu" để cảnh báo
// đổi ngay (banner ở AppShell) — phòng khi phòng khám lên thật mà quên đổi.
// Hash bcrypt CỐ ĐỊNH, không tương ứng mật khẩu thật nào — dùng để so sánh khi tài
// khoản không tồn tại, giúp bcrypt.compare() tốn thời gian TƯƠNG ĐƯƠNG nhánh "sai mật
// khẩu" (tránh lộ qua độ trễ phản hồi việc tài khoản có tồn tại hay không).
const DUMMY_HASH = "$2b$12$MCJ0ELYcGO1tNfm6KMrx5uo8uoPGh4yH8rar1nD1eXxlSATwmnzri";
const WRONG_CREDENTIALS_MSG = "Sai tên đăng nhập hoặc mật khẩu.";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return clientIpFromHeaders(h);
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
  const gate = await checkLoginAllowed(ip, uname);
  if (!gate.ok) {
    const mins = Math.ceil((gate.retryAfterSec ?? 0) / 60);
    return { error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${mins} phút.` };
  }

  // Tìm tài khoản KHÔNG phân biệt hoa/thường (tránh lỗi gõ "Letan" vs "letan").
  const user = await prisma.user.findFirst({
    where: { username: { equals: parsed.data.username, mode: "insensitive" } },
  });
  if (!user || !user.active) {
    // So sánh với hash giả (kết quả bỏ qua) để thời gian phản hồi giống nhánh sai mật khẩu.
    await verifyPassword(parsed.data.password, DUMMY_HASH);
    await registerLoginFailure(ip, uname);
    return { error: WRONG_CREDENTIALS_MSG };
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    await registerLoginFailure(ip, uname);
    return { error: WRONG_CREDENTIALS_MSG };
  }

  // Xác thực 2 lớp (chỉ với tài khoản đã bật) — không ảnh hưởng tài khoản chưa bật.
  if (user.totpEnabled) {
    const code = String(formData.get("code") ?? "");
    if (!user.totpSecret || !totpVerify(user.totpSecret, code)) {
      await registerLoginFailure(ip, uname);
      return { error: code ? "Mã xác thực 2 lớp không đúng." : "Vui lòng nhập mã xác thực 2 lớp (6 số)." };
    }
  }

  await clearLoginFailures(ip, uname);
  await auditRequired(prisma, user.id, "LOGIN", { ip });
  await createSession({
    uid: user.id,
    role: user.role,
    name: user.fullName,
    weakPw: false,
    mustChangePassword: user.mustChangePassword,
  });
  redirect("/dashboard");
}
