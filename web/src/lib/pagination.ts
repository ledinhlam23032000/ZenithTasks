// Phân trang các danh sách lớn (khách hàng, hồ sơ, chăm sóc, kho…) — tránh chỉ thấy
// 60-80 bản ghi mới nhất mãi mãi khi dữ liệu tích luỹ theo thời gian.
export const PAGE_SIZE = 30;

/** Số trang từ query string — luôn ≥ 1, bỏ qua giá trị không hợp lệ. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function totalPagesOf(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
