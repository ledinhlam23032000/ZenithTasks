import type { Role } from "@/generated/prisma/client";

// ============================================================================
// NHÃN VAI TRÒ. Phân quyền chi tiết (mục/năng lực, thêm/bớt theo người) nằm ở
// web/src/lib/permissions.ts.
// ============================================================================

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  TELESALE: "Tiếp nhận / Telesale",
  RECEPTION: "Lễ tân",
  CONSULTANT: "Tư vấn viên",
  DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng",
  CARE: "Chăm sóc khách hàng",
};

export const ROLE_SHORT: Record<Role, string> = {
  ADMIN: "Quản trị",
  MANAGER: "Quản lý",
  TELESALE: "Telesale",
  RECEPTION: "Lễ tân",
  CONSULTANT: "Tư vấn",
  DOCTOR: "Bác sĩ",
  NURSE: "Điều dưỡng",
  CARE: "CSKH",
};

export function isManagerial(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
