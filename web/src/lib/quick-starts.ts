export type QuickStartNav = { href: string; label: string };

export type QuickStartItem = {
  id: string;
  title: string;
  href: string;
  subtitle: string;
  group: "Bắt đầu nhanh";
};

const QUICK_STARTS = [
  { href: "/viec-hom-nay", label: "Việc cần làm", subtitle: "Mở danh sách ưu tiên hôm nay" },
  { href: "/dau-ca", label: "Đầu ca lễ tân", subtitle: "Khách chưa đến và đang chờ" },
  { href: "/tiep-nhan", label: "Tiếp nhận khách", subtitle: "Tra 5 số cuối hoặc lập hồ sơ mới" },
  { href: "/lich-hen", label: "Lịch hẹn", subtitle: "Xem lịch hẹn và tái khám" },
  { href: "/khach-hang", label: "Hồ sơ khách hàng", subtitle: "Mở Customer Workspace" },
] as const;

/**
 * Quick-start chỉ trả về route đã có trong effective navigation của user.
 * Match theo href trước, label sau để chịu được route alias/legacy mà không bypass RBAC.
 */
export function getQuickStartItems(nav: QuickStartNav[], query: string): QuickStartItem[] {
  if (query.trim()) return [];

  return QUICK_STARTS.flatMap((candidate) => {
    const match = nav.find((item) => item.href === candidate.href || item.label === candidate.label);
    return match
      ? [{ id: `quick:${match.href}`, title: candidate.label, href: match.href, subtitle: candidate.subtitle, group: "Bắt đầu nhanh" as const }]
      : [];
  });
}
