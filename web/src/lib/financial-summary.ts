import { toNum } from "./money";

export type FinancialAnomaly =
  | "STALE_SNAPSHOT"
  | "PAYMENT_WITHOUT_SERVICE"
  | "OVERPAYMENT"
  | "INVALID_DISCOUNT"
  | "INVALID_VOUCHER"
  | "INVALID_PAYMENT";

export type FinancialServiceInput = {
  listPrice?: unknown;
  unitPrice?: unknown;
  quantity?: unknown;
  discount?: unknown;
  finalPrice?: unknown;
};

export type FinancialPaymentInput = { amount?: unknown };

export type FinancialSnapshotInput = {
  totalAmount?: unknown;
  paidAmount?: unknown;
  debtAmount?: unknown;
};

export type FinancialSummary = {
  gross: number;
  lineDiscount: number;
  subtotal: number;
  voucher: number;
  total: number;
  paid: number;
  debt: number;
  overpaid: number;
  anomalies: FinancialAnomaly[];
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

function integerMoney(value: unknown): number {
  const n = Math.round(toNum(value));
  return Number.isFinite(n) ? n : 0;
}

function quantity(value: unknown): number {
  const n = Math.floor(toNum(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function validateServicePrice(input: { unitPrice: unknown; quantity: unknown; discount: unknown }): ValidationResult {
  const unitPrice = integerMoney(input.unitPrice);
  const serviceQuantity = quantity(input.quantity);
  const discount = integerMoney(input.discount);
  if (unitPrice < 0 || serviceQuantity < 1 || discount < 0) return { ok: false, error: "Giá dịch vụ không hợp lệ." };
  if (discount > unitPrice * serviceQuantity) return { ok: false, error: "Mức giảm không được lớn hơn giá trị dịch vụ." };
  return { ok: true };
}

export type NormalizedServicePrice = { listPrice: number; unitPrice: number; quantity: number; discount: number };

/**
 * Chuẩn hoá giá dịch vụ TRƯỚC KHI LƯU (gọi sau khi `validateServicePrice` đã qua).
 * Khi nhân viên để "Giá ưu đãi" = 0 để TẶNG/miễn phí (còn giá gốc > 0), lưu dưới dạng
 * giảm giá 100% (unitPrice = giá gốc, discount = đủ để về 0) thay vì giữ nguyên
 * unitPrice = 0 — vì unitPrice=0 & finalPrice=0 là ĐÚNG hình dạng dữ liệu hồ sơ cũ
 * thiếu giá mà `lineBaseFor()` ở dưới coi là "thiếu giá, lấy tạm giá gốc" (xem comment
 * ở đó) — nếu không chuẩn hoá, dịch vụ tặng hôm nay sẽ bị hiểu nhầm thành thiếu giá và
 * bị tính lại đúng giá gốc thay vì 0đ như nhân viên đã nhập.
 */
export function normalizeServicePrice(input: NormalizedServicePrice): NormalizedServicePrice {
  if (input.unitPrice === 0 && input.listPrice > 0) {
    return { listPrice: input.listPrice, unitPrice: input.listPrice, quantity: input.quantity, discount: input.listPrice * input.quantity };
  }
  return input;
}

export function validatePaymentAmount(input: { amount: unknown; total: unknown; paid: unknown }): ValidationResult {
  const amount = integerMoney(input.amount);
  const total = integerMoney(input.total);
  const paid = integerMoney(input.paid);
  if (amount <= 0) return { ok: false, error: "Số tiền phải lớn hơn 0." };
  if (total <= 0) return { ok: false, error: "Không thể ghi nhận thanh toán cho hồ sơ chưa có dịch vụ." };
  if (amount > Math.max(total - paid, 0)) return { ok: false, error: "Số tiền vượt quá công nợ còn lại của hồ sơ." };
  return { ok: true };
}

// Một số hồ sơ cũ lưu listPrice nhưng unitPrice/finalPrice bằng 0. Khi đó,
// listPrice là giá duy nhất còn lại để không làm mất doanh thu đã ghi.
function lineBaseFor(service: FinancialServiceInput): number {
  const listPrice = integerMoney(service.listPrice);
  const unitPrice = integerMoney(service.unitPrice);
  const serviceQuantity = quantity(service.quantity ?? 1);
  const discount = integerMoney(service.discount);
  const storedFinalPrice = integerMoney(service.finalPrice);
  const calculatedLineBase = unitPrice * serviceQuantity;
  return calculatedLineBase > 0
    ? calculatedLineBase
    : storedFinalPrice > 0
      ? storedFinalPrice + discount
      : listPrice * serviceQuantity;
}

/**
 * Thành tiền THỰC (net) của MỘT dòng dịch vụ — nguồn DUY NHẤT cho cách tính
 * 1 dòng. Mọi nơi hiển thị thành tiền per-dòng (hóa đơn, bảng dịch vụ trong
 * hồ sơ, thống kê dịch vụ nổi bật…) PHẢI dùng hàm này thay vì đọc thẳng
 * `finalPrice` từ DB, kẻo hiện 0đ cho đúng những dòng mà `summarizeCase` đã
 * âm thầm bù đúng ở tổng.
 */
export function correctedFinalPrice(service: FinancialServiceInput): number {
  const discount = integerMoney(service.discount);
  return Math.max(lineBaseFor(service) - discount, 0);
}

/**
 * Tính tiền từ child records. Snapshot trên CaseRecord chỉ được dùng để
 * phát hiện lệch dữ liệu, không được dùng làm nguồn sự thật.
 */
export function summarizeCase(input: {
  services: FinancialServiceInput[];
  payments: FinancialPaymentInput[];
  voucherAmount?: unknown;
  snapshot?: FinancialSnapshotInput;
}): FinancialSummary {
  const anomalies = new Set<FinancialAnomaly>();
  let gross = 0;
  let lineDiscount = 0;
  let subtotal = 0;

  for (const service of input.services) {
    const listPrice = integerMoney(service.listPrice);
    const serviceQuantity = quantity(service.quantity ?? 1);
    const discount = integerMoney(service.discount);
    const lineBase = lineBaseFor(service);

    gross += listPrice * serviceQuantity;
    lineDiscount += discount;
    if (discount < 0 || discount > lineBase) anomalies.add("INVALID_DISCOUNT");
    subtotal += Math.max(lineBase - discount, 0);
  }

  const requestedVoucher = integerMoney(input.voucherAmount);
  if (requestedVoucher < 0 || requestedVoucher > subtotal) anomalies.add("INVALID_VOUCHER");
  const voucher = Math.min(Math.max(requestedVoucher, 0), subtotal);
  const total = Math.max(subtotal - voucher, 0);

  let paid = 0;
  for (const payment of input.payments) {
    const amount = integerMoney(payment.amount);
    if (amount <= 0) {
      anomalies.add("INVALID_PAYMENT");
      continue;
    }
    paid += amount;
  }

  const debt = Math.max(total - paid, 0);
  const overpaid = Math.max(paid - total, 0);
  if (input.services.length === 0 && paid > 0) anomalies.add("PAYMENT_WITHOUT_SERVICE");
  if (overpaid > 0) anomalies.add("OVERPAYMENT");

  if (input.snapshot) {
    const snapshotTotal = integerMoney(input.snapshot.totalAmount);
    const snapshotPaid = integerMoney(input.snapshot.paidAmount);
    const snapshotDebt = integerMoney(input.snapshot.debtAmount);
    if (snapshotTotal !== total || snapshotPaid !== paid || snapshotDebt !== debt) anomalies.add("STALE_SNAPSHOT");
  }

  return {
    gross,
    lineDiscount,
    subtotal,
    voucher,
    total,
    paid,
    debt,
    overpaid,
    anomalies: [...anomalies],
  };
}
