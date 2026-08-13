import type { Role } from "@/generated/prisma/client";
import { userCan } from "./permissions";

type SecurityUser = { role: Role; permissions?: unknown };

/** Những tài khoản có thể chạm dữ liệu y tế/tài chính riêng phải dùng TOTP. */
export function requiresTwoFactor(user: SecurityUser): boolean {
  return ["ADMIN", "MANAGER"].includes(user.role) || userCan(user, "clinical.full.read") || userCan(user, "financial.detail.read");
}
