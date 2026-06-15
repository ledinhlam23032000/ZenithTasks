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

// Hạng mục THU (ngoài doanh thu dịch vụ đã ghi ở hồ sơ)
export const INCOME_CATEGORIES: CashCat[] = [
  { code: "SERVICE", label: "Doanh thu dịch vụ" },
  { code: "DEPOSIT", label: "Tiền đặt cọc" },
  { code: "SELL_PRODUCT", label: "Bán sản phẩm/mỹ phẩm" },
  { code: "REFUND_IN", label: "Hoàn tiền từ nhà cung cấp" },
  { code: "OTHER_INC", label: "Thu khác" },
];

export function categoriesFor(type: "INCOME" | "EXPENSE"): CashCat[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.code, c.label]),
);

export function categoryLabel(code: string): string {
  return CATEGORY_LABEL[code] ?? code;
}
