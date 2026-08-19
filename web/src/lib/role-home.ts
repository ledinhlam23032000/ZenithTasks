import type { Role } from "@/generated/prisma/client";
import { userCan } from "./permissions";

export type RoleHomeUser = { role: Role; permissions?: unknown };
export type AppHome = "/dashboard" | "/viec-hom-nay" | "/dau-ca";

/**
 * Chọn màn hình bắt đầu theo mục tiêu công việc, nhưng không vượt qua module gate.
 *
 * Đây là resolver thuần: proxy chỉ truyền role trong JWT; login/root truyền thêm
 * permissions hiệu lực của user. Nếu một grant/deny cá nhân làm mất workspace,
 * resolver sẽ rơi về dashboard an toàn thay vì redirect vào route bị chặn.
 */
export function resolveRoleHome(user: RoleHomeUser): AppHome {
  if ((user.role === "RECEPTION" || user.role === "TELESALE") && userCan(user, "mod:dau-ca")) {
    return "/dau-ca";
  }

  const operationalRoles: Role[] = ["CONSULTANT", "DOCTOR", "CARE"];
  if (operationalRoles.includes(user.role) && userCan(user, "mod:viec-hom-nay")) {
    return "/viec-hom-nay";
  }

  return "/dashboard";
}
