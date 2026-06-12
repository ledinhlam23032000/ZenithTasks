import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import type { Role } from "@/generated/prisma/client";

const COOKIE_NAME = "zsession";
const ALG = "HS256";
const SESSION_HOURS = 12;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Thiếu biến môi trường AUTH_SECRET. Xem web/.env.example");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  uid: string;
  role: Role;
  name: string;
};

export type SafeUser = {
  id: string;
  code: string | null;
  fullName: string;
  username: string;
  role: Role;
  phone: string | null;
  active: boolean;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Tạo JWT và đặt cookie phiên (httpOnly). Gọi trong Server Action / Route Handler. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Đọc & xác thực phiên từ cookie. Trả về null nếu không hợp lệ. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: payload.uid as string,
      role: payload.role as Role,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
});

/** Lấy người dùng hiện tại (đã loại bỏ mật khẩu). Trả về null nếu chưa đăng nhập. */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      code: true,
      fullName: true,
      username: true,
      role: true,
      phone: true,
      active: true,
    },
  });
  if (!user || !user.active) return null;
  return user;
});

/**
 * Bắt buộc đăng nhập. Tuỳ chọn giới hạn theo vai trò.
 * Dùng ở đầu mỗi trang/Server Action cần bảo vệ (yêu cầu số 7).
 */
export async function requireUser(roles?: Role[]): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    redirect("/khong-co-quyen");
  }
  return user;
}
