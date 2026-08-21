export type QuickStartNav = { href: string; label: string };

export type QuickStartItem = {
  id: string;
  title: string;
  href: string;
  subtitle: string;
  group: "Bắt đầu nhanh";
};

type QuickStartCandidate = {
  href: string;
  label: string;
  subtitle: string;
  aliases?: readonly string[];
};

const QUICK_STARTS: readonly QuickStartCandidate[] = [
  { href: "/viec-hom-nay", label: "Việc cần làm", subtitle: "Mở danh sách ưu tiên hôm nay", aliases: ["next action", "công việc"] },
  { href: "/dau-ca", label: "Đầu ca lễ tân", subtitle: "Khách chưa đến và đang chờ", aliases: ["đầu ca", "lễ tân"] },
  { href: "/tiep-nhan", label: "Tiếp nhận khách", subtitle: "Tra tên, mã hoặc 5 số cuối", aliases: ["reception", "check-in"] },
  { href: "/lich-hen", label: "Lịch hẹn", subtitle: "Xem lịch hẹn và tái khám", aliases: ["lịch tái khám", "đặt lịch", "appointment"] },
  { href: "/khach-hang", label: "Hồ sơ khách hàng", subtitle: "Mở Customer Workspace", aliases: ["hồ sơ điều trị", "customer workspace"] },
  { href: "/ke-toan/de-nghi-thanh-toan", label: "Đề nghị thanh toán", subtitle: "Mở phiếu chờ duyệt trong Kế toán", aliases: ["phiếu thanh toán", "duyệt phiếu", "payment request"] },
  { href: "/cham-soc/hop-thu", label: "Hộp thư CSKH", subtitle: "Mở hội thoại và SLA chăm sóc", aliases: ["hộp thư", "chăm sóc khách", "inbox"] },
] as const;

function matches(candidate: QuickStartCandidate, query: string): boolean {
  if (!query) return true;
  const haystack = [candidate.label, candidate.subtitle, ...(candidate.aliases ?? [])].join(" ").toLowerCase();
  return haystack.includes(query);
}

function resolveReachableHref(nav: QuickStartNav[], href: string, label: string): string | null {
  const exact = nav.find((item) => item.href === href || item.label === label);
  if (exact) return exact.href;
  const parent = nav.find((item) => href.startsWith(`${item.href}/`) || item.href.startsWith(`${href}/`));
  return parent ? href : null;
}

/**
 * Alias chỉ trỏ tới route đã có trong effective navigation của user hoặc route
 * con của module đó. Hidden route vì vậy vẫn giữ được RBAC server-side.
 */
function toItems(nav: QuickStartNav[], query: string): QuickStartItem[] {
  const normalized = query.trim().toLowerCase();
  return QUICK_STARTS.flatMap((candidate) => {
    const resolvedHref = resolveReachableHref(nav, candidate.href, candidate.label);
    if (!matches(candidate, normalized) || !resolvedHref) return [];
    return [{ id: `quick:${resolvedHref}`, title: candidate.label, href: resolvedHref, subtitle: candidate.subtitle, group: "Bắt đầu nhanh" as const }];
  });
}

/** Quick-start trên màn hình rỗng; giữ contract không hiển thị khi user đang gõ. */
export function getQuickStartItems(nav: QuickStartNav[], query: string): QuickStartItem[] {
  if (query.trim()) return [];
  return toItems(nav, query);
}

/** Alias nghiệp vụ dùng trong kết quả tìm kiếm khi user đang gõ. */
export function getAliasItems(nav: QuickStartNav[], query: string): QuickStartItem[] {
  if (!query.trim()) return [];
  return toItems(nav, query);
}
