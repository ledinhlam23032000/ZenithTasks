import type { Role } from "@/generated/prisma/client";
import { PLAN_ROLES } from "./plans";

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

export type NavGroup = "Hôm nay" | "Khách hàng" | "Phân tích" | "Trợ Lý" | "Vận hành" | "Quản trị";
export type ModuleDef = { key: string; href: string; label: string; icon: string; group: NavGroup; roles: Role[]; hidden?: boolean };

// Các mục (menu) — đây cũng là nguồn duy nhất cho thanh điều hướng.
// SHAREHOLDER (Cổ đông) được THÊM vào các mục CHỈ-XEM về kinh doanh; KHÔNG thêm vào
// nhân sự / lương / chấm công / lịch làm việc / tiếp nhận / nhật ký (lộ danh sách &
// quy mô nhân sự). Cổ đông không có năng lực thao tác nào (xem CAPABILITIES bên dưới).
export const MODULES: ModuleDef[] = [
  { key: "dashboard", href: "/dashboard", label: "Tổng quan", icon: "LayoutDashboard", group: "Hôm nay", roles: [...ALL, "SHAREHOLDER"] },
  { key: "viec-hom-nay", href: "/viec-hom-nay", label: "Việc cần làm", icon: "ListTodo", group: "Hôm nay", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE"] },
  // Vận hành hằng ngày của lễ tân/telesale — ADMIN/MANAGER không cần thấy trong menu (dùng khi cần thì cấp quyền riêng ở Phân quyền).
  { key: "dau-ca", href: "/dau-ca", label: "Đầu ca lễ tân", icon: "Sunrise", group: "Hôm nay", roles: ["RECEPTION", "TELESALE"] },
  { key: "cham-cong", href: "/cham-cong", label: "Chấm công", icon: "CalendarCheck", group: "Hôm nay", roles: ALL },
  { key: "lich-hen", href: "/lich-hen", label: "Lịch hẹn", icon: "CalendarClock", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "SHAREHOLDER"] },
  { key: "khach-tham-khao", href: "/khach-tham-khao", label: "Khách tham khảo", icon: "UserSearch", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "TELESALE", "RECEPTION"] },
  { key: "tiep-nhan", href: "/tiep-nhan", label: "Tiếp nhận khách", icon: "UserPlus", group: "Khách hàng", roles: ["ADMIN", "RECEPTION", "TELESALE"] },
  { key: "cong-no", href: "/cong-no", label: "Sổ công nợ", icon: "Wallet", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "SHAREHOLDER"] },
  { key: "khach-hang", href: "/khach-hang", label: "Hồ sơ khách hàng", icon: "FolderHeart", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "RECEPTION", "CONSULTANT", "DOCTOR", "CARE", "SHAREHOLDER"] },
  // "Hồ sơ điều trị" gộp vào "Hồ sơ khách hàng" — ẩn khỏi menu, vẫn là 1 module để phân quyền.
  { key: "ho-so", href: "/ho-so", label: "Hồ sơ điều trị", icon: "FolderHeart", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR", "RECEPTION", "SHAREHOLDER"], hidden: true },
  { key: "cham-soc", href: "/cham-soc", label: "Chăm sóc KH", icon: "MessageCircleHeart", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "CARE", "SHAREHOLDER"] },
  // Hộp thư hợp nhất Zalo OA + Facebook Messenger — gộp tab với "Chăm sóc KH" (cùng nhóm quyền).
  { key: "cham-soc-hop-thu", href: "/cham-soc/hop-thu", label: "Hộp thư", icon: "Inbox", group: "Khách hàng", roles: ["ADMIN", "MANAGER", "CARE", "SHAREHOLDER"], hidden: true },
  { key: "bao-cao", href: "/bao-cao", label: "Báo cáo", icon: "TrendingUp", group: "Phân tích", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  // CHỈ ADMIN + SHAREHOLDER (theo yêu cầu chủ) — KHÔNG có MANAGER, khác các mục còn lại trong nhóm này.
  { key: "chi-phi-dau-tu", href: "/chi-phi-dau-tu", label: "Chi phí đầu tư", icon: "Building2", group: "Phân tích", roles: ["ADMIN", "SHAREHOLDER"] },
  // Phân tích kinh doanh vẫn gộp tab với Báo cáo.
  { key: "phan-tich", href: "/phan-tich", label: "Phân tích kinh doanh", icon: "PieChart", group: "Phân tích", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"], hidden: true },
  // Để thành nhóm riêng và hiện trực tiếp: cổ đông lớn tuổi không phải tìm trong tab Báo cáo.
  { key: "tro-ly", href: "/tro-ly", label: "Trợ lý AI", icon: "Sparkles", group: "Trợ Lý", roles: ["ADMIN", "SHAREHOLDER"] },
  // Lập kế hoạch (nhiệm vụ chính/phụ + ghi chú, AI có thể soạn nháp) — CHỈ ADMIN/MANAGER/SHAREHOLDER
  // (Cổ đông toàn quyền — ngoại lệ riêng cho mục này, khác quy ước "chỉ xem" mọi nơi khác).
  { key: "ke-hoach", href: "/ke-hoach", label: "Kế hoạch", icon: "ListTree", group: "Trợ Lý", roles: [...PLAN_ROLES] },
  { key: "hieu-suat", href: "/hieu-suat", label: "Hiệu suất nhân sự", icon: "Activity", group: "Phân tích", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  // Gộp chung tab với "Hiệu suất nhân sự".
  { key: "cong-tac-vien", href: "/cong-tac-vien", label: "Cộng tác viên", icon: "Handshake", group: "Phân tích", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"], hidden: true },
  { key: "lich-lam-viec", href: "/lich-lam-viec", label: "Lịch làm việc", icon: "CalendarDays", group: "Vận hành", roles: ALL, hidden: true }, // gộp tab với "Chấm công"
  { key: "luong", href: "/luong", label: "Lương & hoa hồng", icon: "Wallet", group: "Vận hành", roles: ["ADMIN", "MANAGER"] },
  { key: "thu-chi", href: "/thu-chi", label: "Thu chi", icon: "Coins", group: "Vận hành", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  // Kế toán gộp doanh thu + thu chi + lương thành một bảng kết quả kinh doanh.
  // KHÔNG mở cho Cổ đông vì có chi tiết lương từng nhân sự.
  { key: "ke-toan", href: "/ke-toan", label: "Kế toán", icon: "Calculator", group: "Vận hành", roles: ["ADMIN", "MANAGER"] },
  { key: "de-nghi-thanh-toan", href: "/ke-toan/de-nghi-thanh-toan", label: "Đề nghị thanh toán", icon: "FileSignature", group: "Vận hành", roles: ["ADMIN", "MANAGER"], hidden: true },
  { key: "danh-muc", href: "/danh-muc", label: "Danh mục dịch vụ", icon: "ListChecks", group: "Vận hành", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"] },
  // Gộp chung tab với "Danh mục dịch vụ".
  { key: "kho", href: "/kho", label: "Kho vật tư", icon: "Boxes", group: "Vận hành", roles: ["ADMIN", "MANAGER", "SHAREHOLDER"], hidden: true },
  { key: "nhan-su", href: "/nhan-su", label: "Nhân sự", icon: "Contact", group: "Quản trị", roles: ["ADMIN"] },
  { key: "nhat-ky", href: "/nhat-ky", label: "Nhật ký hệ thống", icon: "ScrollText", group: "Quản trị", roles: ["ADMIN"] },
  { key: "he-thong", href: "/he-thong", label: "Tình trạng hệ thống", icon: "ServerCog", group: "Quản trị", roles: ["ADMIN"] },
  { key: "ket-noi-kenh", href: "/cham-soc/ket-noi", label: "Kết nối kênh", icon: "Plug", group: "Quản trị", roles: ["ADMIN"] },
  { key: "mau-phieu", href: "/mau-phieu", label: "Mẫu phiếu đồng ý", icon: "FileSignature", group: "Quản trị", roles: ["ADMIN", "MANAGER"] },
];

export type CapDef = { key: string; label: string; group: string; roles: Role[] };

// Các năng lực thao tác (mịn hơn mục).
export const CAPABILITIES: CapDef[] = [
  { key: "case.clinical", label: "Thao tác hồ sơ (thêm/sửa dịch vụ, vật tư, ảnh, tư vấn)", group: "Hồ sơ điều trị", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR"] },
  { key: "payment.add", label: "Thu tiền cho hồ sơ", group: "Tài chính", roles: ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR", "RECEPTION"] },
  { key: "payment.manage", label: "Sửa / xóa khoản thu", group: "Tài chính", roles: ["ADMIN", "MANAGER"] },
  { key: "accounting.pay", label: "Ghi sổ chi lương & hoa hồng cộng tác viên", group: "Kế toán", roles: ["ADMIN"] },
  { key: "accounting.close", label: "Chốt sổ / mở lại sổ tháng", group: "Kế toán", roles: ["ADMIN"] },
  { key: "phone.full", label: "Xem số điện thoại đầy đủ của khách", group: "Bảo mật", roles: ["ADMIN", "MANAGER"] },
  { key: "inbox.view", label: "Xem hội thoại được phân công", group: "Hộp thư chăm sóc", roles: ["ADMIN", "MANAGER", "CARE"] },
  { key: "inbox.viewAll", label: "Xem toàn bộ hội thoại", group: "Hộp thư chăm sóc", roles: ["ADMIN", "MANAGER"] },
  { key: "inbox.reply", label: "Trả lời khách qua kênh kết nối", group: "Hộp thư chăm sóc", roles: ["ADMIN", "MANAGER", "CARE"] },
  { key: "inbox.assign", label: "Phân công hội thoại", group: "Hộp thư chăm sóc", roles: ["ADMIN", "MANAGER", "CARE"] },
  { key: "inbox.linkCustomer", label: "Liên kết hội thoại với khách hàng", group: "Hộp thư chăm sóc", roles: ["ADMIN", "MANAGER", "CARE"] },
  { key: "inbox.manageChannels", label: "Kết nối và quản lý kênh", group: "Hộp thư chăm sóc", roles: ["ADMIN"] },
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
  // Hội thoại có thể chứa thông tin sức khỏe nhạy cảm. Cổ đông không được mở
  // quyền inbox bằng grant tùy chỉnh; đây là ranh giới bắt buộc ở tầng server.
  if (user.role === "SHAREHOLDER" && key.startsWith("inbox.")) return false;
  // Ranh giới cứng: dù bị cấp grant nhầm, chỉ Admin/Cổ đông được dùng Trợ lý AI / xem Chi phí đầu tư.
  if ((key === "mod:tro-ly" || key === "mod:chi-phi-dau-tu") && user.role !== "ADMIN" && user.role !== "SHAREHOLDER") return false;
  // Ranh giới cứng RIÊNG cho Kế hoạch: khác dòng trên vì CÓ THÊM MANAGER (theo yêu cầu chủ) —
  // ADMIN + MANAGER + SHAREHOLDER đều toàn quyền; mọi vai trò khác bị chặn cứng dù có grant nhầm.
  if (key === "mod:ke-hoach" && !PLAN_ROLES.includes(user.role)) return false;
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
export function navForUser(user: UserLike): { href: string; label: string; icon: string; group: NavGroup }[] {
  return MODULES.filter((m) => !m.hidden && userCan(user, `mod:${m.key}`)).map((m) => ({ href: m.href, label: m.label, icon: m.icon, group: m.group }));
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
