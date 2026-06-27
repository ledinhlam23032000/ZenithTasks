import type { Role } from "@/generated/prisma/client";

// ============================================================================
// HỆ THỐNG PHÂN QUYỀN — mặc định theo vai trò + tuỳ chỉnh thêm/bớt theo từng người.
//
// Mỗi "quyền" có một KEY:
//   - Truy cập mục:  "mod:<key>"  (vd "mod:ho-so") — gate cả menu lẫn trang.
//   - Năng lực:      vd "case.clinical", "payment.add"...
//
// Quyền hiệu lực của 1 người = (mặc định theo vai trò ∪ grant) − deny.
// (grant/deny lưu ở User.permissions dạng JSON { grant:[], deny:[] })
// ============================================================================

const ALL: Role[] = ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "NURSE", "CARE"];

export type ModuleDef = { key: string; href: string; label: string; icon: string; roles: Role[]; hidden?: boolean };

// Các mục (menu) — đây cũng là nguồn duy nhất cho thanh điều hướng.
// SHAREHOLDER (Cổ đông) được THÊM vào các mục CHỈ-XEM về kinh doanh; KHÔNG thêm vào
// nhân sự / lương / chấm công / lịch làm việc / tiếp nhận / nhật ký (lộ danh sách &
// quy mô nhân sự). Cổ đông không có năng lực thao tác nào (xem CAPABILITIES bên dưới).
export const MODULES: ModuleDef[] = [
  { key: "dashboard", href: "/dashboard", label: "Tổng quan", icon: "LayoutDashboard", roles: [...ALL, "SHAREHOLDER"] },
  { key: "viec-hom-nay", href: "/viec-hom-nay", label: "Việc cần làm", icon: "ListTodo", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"] },
  { key: "dau-ca", href: "/dau-ca", label: "Đầu ca lễ tân", icon: "Sunrise", roles: ["ADMIN", "MANAGER", "RECEPTION", "TELESALE"] },
  { key: "cham-cong", href: "/cham-cong", label: "Chấm công", icon: "CalendarCheck", roles: ALL },
  { key: "lich-hen", href: "/lich-hen", label: "Lịch hẹn", icon: "CalendarClock", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "SHAREHOLDER"] },
  { key: "tiep-nhan", href: "/tiep-nhan", label: "Tiếp nhận khách", icon: "UserPlus", roles: ["ADMIN", "RECEPTION", "TELESALE"] },
  { key: "cong-no", href: "/cong-no", label: "Sổ công nợ", icon: "Wallet", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "SHAREHOLDER"] },
  { key: "khach-hang", href: "/khach-hang", label: "Hồ sơ khách hàng", icon: "FolderHeart", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE", "SHAREHOLDER"] },
  // "Hồ sơ điều trị" gộp vào "Hồ sơ khách hàng" — ẩn khỏi menu, vẫn là 1 module để phân quyền.
  { key: "ho-so", href: "/ho-so", label: "Hồ sơ điều trị", icon: "FolderHeart", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR", "RECEPTION", "SHAREHOLDER"], hidden: true },
  { key: "cham-soc", href: "/cham-soc", label: "Chăm sóc KH", icon: "MessageCircleHeart", roles: ["ADMIN", "MANAGER", "CARE", "SHAREHOLDER"] },
  { key: "bao-cao", href: "/bao-cao", label: "Báo cáo", icon: "TrendingUp", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "phan-tich", href: "/phan-tich", label: "Phân tích kinh doanh", icon: "PieChart", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "hieu-suat", href: "/hieu-suat", label: "Hiệu suất nhân sự", icon: "Activity", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "cong-tac-vien", href: "/cong-tac-vien", label: "Cộng tác viên", icon: "Handshake", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "lich-lam-viec", href: "/lich-lam-viec", label: "Lịch làm việc", icon: "CalendarDays", roles: ALL },
  { key: "luong", href: "/luong", label: "Lương & hoa hồng", icon: "Wallet", roles: ["ADMIN", "MANAGER"] },
  { key: "thu-chi", href: "/thu-chi", label: "Thu chi", icon: "Coins", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "nhan-su", href: "/nhan-su", label: "Nhân sự", icon: "Contact", roles: ["ADMIN"] },
  { key: "nhat-ky", href: "/nhat-ky", label: "Nhật ký hệ thống", icon: "ScrollText", roles: ["ADMIN"] },
  { key: "he-thong", href: "/he-thong", label: "Tình trạng hệ thống", icon: "ServerCog", roles: ["ADMIN"] },
  { key: "danh-muc", href: "/danh-muc", label: "Danh mục dịch vụ", icon: "ListChecks", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  { key: "mau-phieu", href: "/mau-phieu", label: "Mẫu phiếu đồng ý", icon: "FileSignature", roles: ["ADMIN", "MANAGER"] },
  { key: "kho", href: "/kho", label: "Kho vật tư", icon: "Boxes", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
];

export type CapDef = { key: string; label: string; group: string; roles: Role[] };

// Các năng lực thao tác (mịn hơn mục).
export const CAPABILITIES: CapDef[] = [
  { key: "case.clinical", label: "Thao tác hồ sơ (thêm/sửa dịch vụ, vật tư, ảnh, tư vấn)", group: "Hồ sơ điều trị", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR"] },
  { key: "payment.add", label: "Thu tiền cho hồ sơ", group: "Tài chính", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR", "RECEPTION"] },
  { key: "payment.manage", label: "Sửa / xóa khoản thu", group: "Tài chính", roles: ["ADMIN", "MANAGER"] },
  { key: "phone.full", label: "Xem số điện thoại đầy đủ của khách", group: "Bảo mật", roles: ["ADMIN", "MANAGER"] },
];

// key -> roles mặc định
const DEFAULTS: Record<string, Role[]> = {};
for (const m of MODULES) DEFAULTS[`mod:${m.key}`] = m.roles;
for (const c of CAPABILITIES) DEFAULTS[c.key] = c.roles;

export const ALL_PERM_KEYS: string[] = Object.keys(DEFAULTS);

export type PermOverride = { grant: string[]; deny: string[] };
type UserLike = { role: Role; permissions?: unknown };

export function parsePerms(raw: unknown): PermOverride {
  if (raw && typeof raw === "object") {
    const o = raw as { grant?: unknown; deny?: unknown };
    return {
      grant: Array.isArray(o.grant) ? o.grant.map(String) : [],
      deny: Array.isArray(o.deny) ? o.deny.map(String) : [],
    };
  }
  return { grant: [], deny: [] };
}

/** Người dùng có quyền này không (đã tính cả grant/deny tuỳ chỉnh)? */
export function userCan(user: UserLike, key: string): boolean {
  const p = parsePerms(user.permissions);
  if (p.deny.includes(key)) return false;
  if (p.grant.includes(key)) return true;
  return (DEFAULTS[key] ?? []).includes(user.role);
}

/** Có được truy cập 1 đường dẫn (map về module gốc) không? */
export function moduleCan(user: UserLike, href: string): boolean {
  const mod = MODULES.find((m) => href === m.href || href.startsWith(m.href + "/"));
  if (!mod) return true;
  return userCan(user, `mod:${mod.key}`);
}

/** Menu điều hướng theo quyền hiệu lực của người dùng (bỏ qua module ẩn). */
export function navForUser(user: UserLike): { href: string; label: string; icon: string }[] {
  return MODULES.filter((m) => !m.hidden && userCan(user, `mod:${m.key}`)).map((m) => ({ href: m.href, label: m.label, icon: m.icon }));
}

/** Toàn bộ key đang bật của 1 người (để hiển thị trên giao diện phân quyền). */
export function effectiveKeys(user: UserLike): string[] {
  return ALL_PERM_KEYS.filter((k) => userCan(user, k));
}

/** Tính grant/deny từ tập key admin muốn bật, so với mặc định theo vai trò. */
export function diffFromDesired(role: Role, desired: string[]): PermOverride {
  const want = new Set(desired);
  const grant: string[] = [];
  const deny: string[] = [];
  for (const key of ALL_PERM_KEYS) {
    const def = (DEFAULTS[key] ?? []).includes(role);
    if (want.has(key) && !def) grant.push(key);
    if (!want.has(key) && def) deny.push(key);
  }
  return { grant, deny };
}

/** Danh mục quyền cho giao diện phân quyền. */
export function permCatalog() {
  return {
    modules: MODULES.map((m) => ({ key: `mod:${m.key}`, label: m.label })),
    caps: CAPABILITIES.map((c) => ({ key: c.key, label: c.label, group: c.group })),
  };
}
