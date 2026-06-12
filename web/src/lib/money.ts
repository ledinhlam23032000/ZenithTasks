// Tiện ích tiền tệ (VND). Prisma trả về kiểu Decimal — ta quy về number để hiển thị.

export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v as string);
  return Number.isFinite(n) ? n : 0;
}

const vnd = new Intl.NumberFormat("vi-VN");

/** "1.234.567 ₫" */
export function formatVND(v: unknown): string {
  return `${vnd.format(Math.round(toNum(v)))} ₫`;
}

/** "1.234.567" (không kèm ký hiệu) */
export function formatNumber(v: unknown): string {
  return vnd.format(Math.round(toNum(v)));
}

/** Rút gọn: 1.2 tr, 12,5 tr, 1,3 tỷ — dùng cho thẻ thống kê. */
export function formatVNDShort(v: unknown): string {
  const n = toNum(v);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)} k`;
  return vnd.format(Math.round(n));
}
