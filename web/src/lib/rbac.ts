import type { Role } from "@/generated/prisma/client";

// ============================================================================
// PHÂN QUYỀN THEO VAI TRÒ (Yêu cầu số 7: mỗi nhân sự chỉ thấy phần của mình)
// ============================================================================

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  TELESALE: "Tiếp nhận / Telesale",
  RECEPTION: "Lễ tân",
  CONSULTANT: "Tư vấn viên",
  DOCTOR: "Bác sĩ",
  CARE: "Chăm sóc khách hàng",
};

export const ROLE_SHORT: Record<Role, string> = {
  ADMIN: "Quản trị",
  MANAGER: "Quản lý",
  TELESALE: "Telesale",
  RECEPTION: "Lễ tân",
  CONSULTANT: "Tư vấn",
  DOCTOR: "Bác sĩ",
  CARE: "CSKH",
};

export type NavItem = {
  href: string;
  label: string;
  icon: string; // tên icon lucide-react
  roles: Role[];
};

const ALL: Role[] = ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"];

// Menu điều hướng. Mỗi mục khai báo vai trò được phép thấy.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "LayoutDashboard", roles: ALL },
  { href: "/lich-hen", label: "Lịch hẹn", icon: "CalendarClock", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT"] },
  { href: "/tiep-nhan", label: "Tiếp nhận khách", icon: "UserPlus", roles: ["ADMIN", "RECEPTION", "TELESALE"] },
  { href: "/khach-hang", label: "Khách hàng", icon: "Users", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"] },
  { href: "/ho-so", label: "Hồ sơ điều trị", icon: "FolderHeart", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR"] },
  { href: "/cham-soc", label: "Chăm sóc KH", icon: "MessageCircleHeart", roles: ["ADMIN", "MANAGER", "CARE"] },
  { href: "/bao-cao", label: "Báo cáo", icon: "TrendingUp", roles: ["ADMIN", "MANAGER"] },
  { href: "/lich-lam-viec", label: "Lịch làm việc", icon: "CalendarDays", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE", "TELESALE"] },
  { href: "/nhan-su", label: "Nhân sự", icon: "Contact", roles: ["ADMIN"] },
  { href: "/danh-muc", label: "Danh mục dịch vụ", icon: "ListChecks", roles: ["ADMIN", "MANAGER"] },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccess(role: Role, href: string): boolean {
  const item = NAV_ITEMS.find((i) => href === i.href || href.startsWith(i.href + "/"));
  if (!item) return true; // trang không nằm trong menu (vd: trang con) — kiểm soát tại trang
  return item.roles.includes(role);
}

export function isManagerial(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
