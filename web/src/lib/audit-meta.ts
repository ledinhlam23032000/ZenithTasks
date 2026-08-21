const LABELS: Record<string, string> = {
  amount: "Số tiền",
  code: "Mã",
  caseId: "Hồ sơ",
  customerId: "Khách",
  collaboratorId: "CTV",
  reason: "Lý do",
  status: "Trạng thái",
  fromRole: "Từ vai trò",
  toRole: "Sang vai trò",
  scheduledAt: "Lịch",
  source: "Nguồn",
  fields: "Trường",
};

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  if (key === "amount" && Number.isFinite(Number(value))) return `${Number(value).toLocaleString("vi-VN")} đ`;
  if (key === "scheduledAt") {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("vi-VN");
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return "";
  return String(value);
}

/** Rút gọn meta audit cho người đọc, không hiển thị JSON nội bộ dài. */
export function formatAuditMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const entries = Object.entries(meta as Record<string, unknown>);
  return entries
    .map(([key, value]) => {
      const rendered = formatValue(key, value);
      return rendered ? `${LABELS[key] ?? key}: ${rendered}` : "";
    })
    .filter(Boolean)
    .slice(0, 5)
    .join(" · ");
}
