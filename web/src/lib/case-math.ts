// ============================================================================
// TOÁN TIỀN HỒ SƠ ĐIỀU TRỊ (thuần, không phụ thuộc DB → dễ kiểm thử).
//
// Quy tắc (khớp với recalc() trong ho-so/actions.ts):
//   subtotal = Σ finalPrice (mỗi dịch vụ = đơn giá×SL − giảm, đã tính sẵn)
//   voucher  = min(voucherAmount, subtotal)   (voucher không vượt quá tổng)
//   net      = subtotal − voucher             (= totalAmount = công nợ gốc)
//   paid     = Σ payment.amount
//   debt     = max(net − paid, 0)             (trả dư không thành "nợ âm")
// Hoa hồng KHÔNG tự tính (nhập tay) — không nằm trong hàm này.
// ============================================================================

export type CaseTotalsInput = {
  /** finalPrice của từng dịch vụ trong hồ sơ. */
  finalPrices: number[];
  /** discount (giảm giá) của từng dịch vụ — chỉ để tổng hợp hiển thị. */
  discounts: number[];
  /** Số tiền voucher (đã quy ra VND). */
  voucherAmount: number;
  /** Số tiền từng khoản đã thu. */
  payments: number[];
};

export type CaseTotals = {
  /** = net (tổng sau voucher) — lưu vào totalAmount. */
  total: number;
  /** Tổng giảm giá ở mức dịch vụ. */
  discount: number;
  /** Tổng đã thu. */
  paid: number;
  /** Công nợ còn lại (không âm). */
  debt: number;
};

const sum = (xs: number[]) => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);

export function computeCaseTotals(input: CaseTotalsInput): CaseTotals {
  const subtotal = sum(input.finalPrices);
  const discount = sum(input.discounts);
  const voucher = Math.min(Math.max(input.voucherAmount || 0, 0), subtotal);
  const net = subtotal - voucher;
  const paid = sum(input.payments);
  const debt = Math.max(net - paid, 0);
  return { total: net, discount, paid, debt };
}
