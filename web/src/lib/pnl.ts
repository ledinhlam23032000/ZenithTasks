// ============================================================================
// LÃI / LỖ (P&L) — toán THUẦN, không I/O, dễ kiểm thử (E2: tách tầng domain tiền).
//
// Lãi = doanh thu dịch vụ (tiền thực thu từ hồ sơ) + thu khác − tổng chi.
// "Thu khác" BỎ các mã chuyển/ứng từ doanh thu (REVENUE_TRANSFER_CODES) để KHÔNG
// tính trùng với doanh thu dịch vụ. Hàm này nhận dữ liệu đã đọc sẵn từ DB.
// ============================================================================

export type PnlTxn = { type: "INCOME" | "EXPENSE"; category: string | null; amount: number };

export type Pnl = {
  serviceRevenue: number;
  otherIncome: number;
  totalExpense: number;
  profit: number;
};

/**
 * Tính Lãi/Lỗ từ doanh thu dịch vụ + danh sách giao dịch sổ thu chi.
 * `transferCodes`: các mã hạng mục THU bị loại khỏi "thu khác" (tránh tính trùng doanh thu).
 */
export function computePnl(serviceRevenue: number, txns: PnlTxn[], transferCodes: readonly string[] = []): Pnl {
  let otherIncome = 0;
  let totalExpense = 0;
  for (const t of txns) {
    const a = t.amount;
    if (t.type === "INCOME") {
      if (!transferCodes.includes(t.category ?? "")) otherIncome += a;
    } else {
      totalExpense += a;
    }
  }
  return { serviceRevenue, otherIncome, totalExpense, profit: serviceRevenue + otherIncome - totalExpense };
}
