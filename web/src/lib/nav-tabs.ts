import { userCan } from "@/lib/permissions";
import type { PageTab } from "@/components/ui/page-tabs";

type UserLike = Parameters<typeof userCan>[0];

function filterTabs(user: UserLike, tabs: (PageTab & { modKey: string })[]): PageTab[] {
  return tabs.filter((t) => userCan(user, `mod:${t.modKey}`)).map(({ href, label }) => ({ href, label }));
}

/** Báo cáo / Phân tích kinh doanh — gộp chung 1 mục menu ("Báo cáo"). */
export function reportTabs(user: UserLike): PageTab[] {
  return filterTabs(user, [
    { modKey: "bao-cao", href: "/bao-cao", label: "Báo cáo" },
    { modKey: "phan-tich", href: "/phan-tich", label: "Phân tích kinh doanh" },
  ]);
}

/** Hiệu suất nhân sự / Cộng tác viên — gộp chung 1 mục menu ("Hiệu suất nhân sự"). */
export function performanceTabs(user: UserLike): PageTab[] {
  return filterTabs(user, [
    { modKey: "hieu-suat", href: "/hieu-suat", label: "Hiệu suất nhân sự" },
    { modKey: "cong-tac-vien", href: "/cong-tac-vien", label: "Cộng tác viên" },
  ]);
}

/** Danh mục dịch vụ / Kho vật tư — gộp chung 1 mục menu ("Danh mục dịch vụ"). */
export function catalogTabs(user: UserLike): PageTab[] {
  return filterTabs(user, [
    { modKey: "danh-muc", href: "/danh-muc", label: "Danh mục & dịch vụ" },
    { modKey: "kho", href: "/kho", label: "Kho vật tư" },
  ]);
}

/** Chấm công / Lịch làm việc — gộp chung 1 mục menu ("Chấm công"). */
export function attendanceTabs(user: UserLike): PageTab[] {
  return filterTabs(user, [
    { modKey: "cham-cong", href: "/cham-cong", label: "Chấm công" },
    { modKey: "lich-lam-viec", href: "/lich-lam-viec", label: "Lịch làm việc" },
  ]);
}

/** Chăm sóc KH / Hộp thư (Zalo OA + Facebook) — gộp chung 1 mục menu ("Chăm sóc KH"). */
export function careTabs(user: UserLike): PageTab[] {
  return filterTabs(user, [
    { modKey: "cham-soc", href: "/cham-soc", label: "Nhật ký chăm sóc" },
    { modKey: "cham-soc-hop-thu", href: "/cham-soc/hop-thu", label: "Hộp thư" },
  ]);
}
