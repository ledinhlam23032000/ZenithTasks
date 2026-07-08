// Danh mục Sổ thu chi (dòng tiền vận hành). Hạng mục đa dạng cho phòng khám.

export const CASH_TYPE = {
  INCOME: { label: "Thu", tone: "green" as const },
  EXPENSE: { label: "Chi", tone: "red" as const },
};

export type CashCat = { code: string; label: string };

// Hạng mục CHI (chi phí vận hành)
export const EXPENSE_CATEGORIES: CashCat[] = [
  { code: "MATERIAL", label: "Vật tư y tế" },
  { code: "MEDICINE", label: "Thuốc & mỹ phẩm" },
  { code: "EQUIPMENT", label: "Máy móc & thiết bị" },
  // Chi phí ĐẦU TƯ (mua sắm tài sản lớn, cải tạo mặt bằng…) — khác chi phí vận hành ngày
  // thường. Xem riêng ở `/chi-phi-dau-tu` (CHỈ ADMIN + SHAREHOLDER) — mã INVESTMENT bị
  // LỌC KHỎI trang Sổ thu chi thường với người không phải Admin/Cổ đông, xem `INVESTMENT_CATEGORY_CODE`.
  { code: "INVESTMENT", label: "Chi phí đầu tư" },
  { code: "SALARY", label: "Lương nhân viên" },
  { code: "COMMISSION", label: "Hoa hồng cộng tác viên" },
  { code: "MARKETING", label: "Marketing & quảng cáo" },
  { code: "RENT", label: "Thuê mặt bằng" },
  { code: "UTILITIES", label: "Điện, nước" },
  { code: "INTERNET", label: "Internet & điện thoại" },
  { code: "OFFICE", label: "Văn phòng phẩm" },
  { code: "HOSPITALITY", label: "Tiếp khách & ăn uống" },
  { code: "MAINTENANCE", label: "Sửa chữa & bảo trì" },
  { code: "TAX", label: "Thuế & phí" },
  { code: "TRAINING", label: "Đào tạo nhân sự" },
  { code: "TRANSPORT", label: "Vận chuyển & đi lại" },
  { code: "OTHER_EXP", label: "Chi khác" },
];

// Hạng mục THU (dòng tiền vào sổ vận hành — KHÔNG phải doanh thu dịch vụ; doanh
// thu dịch vụ được tính tự động từ hồ sơ và xem ở Báo cáo).
export const INCOME_CATEGORIES: CashCat[] = [
  { code: "ADVANCE_REVENUE", label: "Ứng từ doanh thu để chi trả" },
  { code: "DEPOSIT", label: "Tiền đặt cọc" },
  { code: "SELL_PRODUCT", label: "Bán sản phẩm/mỹ phẩm" },
  { code: "REFUND_IN", label: "Hoàn tiền từ nhà cung cấp" },
  { code: "OTHER_INC", label: "Thu khác" },
];

/**
 * Các mã THU chỉ là "luân chuyển" tiền từ doanh thu (không phải thu nhập mới)
 * → KHÔNG cộng vào Lãi/Lỗ để tránh tính trùng với doanh thu dịch vụ.
 * (Giữ "SERVICE" cho dữ liệu cũ từng ghi "Doanh thu dịch vụ" trong sổ.)
 */
export const REVENUE_TRANSFER_CODES = ["ADVANCE_REVENUE", "SERVICE"];

/** Mã hạng mục Chi phí đầu tư — ẩn khỏi Sổ thu chi thường với người không phải ADMIN/SHAREHOLDER. */
export const INVESTMENT_CATEGORY_CODE = "INVESTMENT";

export function categoriesFor(type: "INCOME" | "EXPENSE"): CashCat[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  [
    ...EXPENSE_CATEGORIES,
    ...INCOME_CATEGORIES,
    { code: "SERVICE", label: "Doanh thu dịch vụ (cũ)" }, // nhãn cho dữ liệu cũ
  ].map((c) => [c.code, c.label]),
);

export function categoryLabel(code: string): string {
  return CATEGORY_LABEL[code] ?? code;
}
