// ============================================================================
// LÃI / LỖ (P&L) — toán THUẦN, không I/O, dễ kiểm thử (E2: tách tầng domain tiền).
//
// Lãi = doanh thu dịch vụ (tiền thực thu từ hồ sơ) + thu khác
//       − chi vận hành − chi lương − hoa hồng cộng tác viên.
//
// BA QUY TẮC CHỐNG TÍNH TRÙNG (mọi trang phải dùng chung file này):
//   1. "Doanh thu dịch vụ" là tiền khách ĐÃ TRẢ (Payment), không phải giá trị hồ sơ.
//   2. "Thu khác" BỎ các mã chuyển/ứng từ doanh thu (REVENUE_TRANSFER_CODES) vì đó
//      chỉ là luân chuyển tiền, không phải thu nhập mới.
//   3. Lương & hoa hồng CTV LUÔN lấy từ bảng lương. Phiếu chi hạng mục SALARY /
//      COMMISSION trong Sổ thu chi (do trang Kế toán sinh ra để theo dõi dòng tiền)
//      bị LOẠI khỏi "chi vận hành" — nếu không sẽ cộng hai lần.
//
// Hàm ở đây nhận dữ liệu đã đọc sẵn từ DB (xem `lib/accounting.ts`).
// ============================================================================

export type PnlTxn = { type: "INCOME" | "EXPENSE"; category: string | null; amount: number };

/** Hạng mục chi do trang Kế toán sinh ra khi ghi sổ chi lương / hoa hồng CTV. */
export const SALARY_CATEGORY = "SALARY";
export const COMMISSION_CATEGORY = "COMMISSION";
export const PAYROLL_CATEGORIES: readonly string[] = [SALARY_CATEGORY, COMMISSION_CATEGORY];

export type CashSplit = {
  otherIncome: number; // Thu khác (đã bỏ khoản ứng từ doanh thu)
  transferIn: number; // Ứng từ doanh thu để chi trả (luân chuyển, không phải thu nhập)
  operatingExpense: number; // Chi vận hành — KHÔNG gồm lương & hoa hồng CTV
  salaryPosted: number; // Phiếu chi lương đã ghi trong sổ thu chi
  commissionPosted: number; // Phiếu chi hoa hồng CTV đã ghi trong sổ thu chi
  expenseByCategory: { code: string; amount: number }[]; // xếp giảm dần (gồm cả lương/HH)
};

/** Bóc tách các dòng Sổ thu chi trong tháng theo đúng quy tắc chống tính trùng. */
export function splitCashflow(txns: PnlTxn[], transferCodes: readonly string[] = []): CashSplit {
  let otherIncome = 0;
  let transferIn = 0;
  let operatingExpense = 0;
  let salaryPosted = 0;
  let commissionPosted = 0;
  const byCat = new Map<string, number>();

  for (const t of txns) {
    const a = t.amount;
    const cat = t.category ?? "";
    if (t.type === "INCOME") {
      if (transferCodes.includes(cat)) transferIn += a;
      else otherIncome += a;
      continue;
    }
    byCat.set(cat, (byCat.get(cat) ?? 0) + a);
    if (cat === SALARY_CATEGORY) salaryPosted += a;
    else if (cat === COMMISSION_CATEGORY) commissionPosted += a;
    else operatingExpense += a;
  }

  return {
    otherIncome,
    transferIn,
    operatingExpense,
    salaryPosted,
    commissionPosted,
    expenseByCategory: [...byCat.entries()]
      .map(([code, amount]) => ({ code, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export type PnlInput = {
  serviceRevenue: number;
  otherIncome: number;
  operatingExpense: number;
  salaryExpense: number; // từ BẢNG LƯƠNG (phải trả), không phải từ sổ thu chi
  ctvCommission: number; // hoa hồng cộng tác viên (bảng lương)
};

export type Pnl = PnlInput & {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  margin: number; // % lãi trên tổng thu (làm tròn)
};

/** Kết quả kinh doanh của kỳ: tổng thu − tổng chi. */
export function computePnl(i: PnlInput): Pnl {
  const totalIncome = i.serviceRevenue + i.otherIncome;
  const totalExpense = i.operatingExpense + i.salaryExpense + i.ctvCommission;
  const profit = totalIncome - totalExpense;
  return {
    ...i,
    totalIncome,
    totalExpense,
    profit,
    margin: totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0,
  };
}
