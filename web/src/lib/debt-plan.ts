// ============================================================================
// KẾ HOẠCH TRẢ NỢ (hẹn nợ) — toán THUẦN, không I/O, dễ kiểm thử.
//
// Khách công nợ cam kết: mỗi tháng vào "ngày X" trả "Y đồng" cho tới khi hết nợ.
// Các hàm dưới chỉ tính lịch + trạng thái từ tham số truyền vào — KHÔNG đọc DB.
// ============================================================================

export type DebtPlanLike = {
  dayOfMonth: number; // ngày trả hàng tháng (1..28)
  monthlyAmount: number; // số tiền trả mỗi tháng (VND)
  startDate: Date; // mốc kỳ trả đầu tiên
};

/** Chuẩn hoá ngày trong tháng về 1..28 (tránh lệ thuộc tháng thiếu ngày 29/30/31). */
export function clampDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(28, Math.max(1, Math.trunc(day)));
}

const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Ngày đáo hạn KẾ TIẾP (đúng "ngày X" trong tháng) vào hoặc sau `from`. */
export function nextDueDate(dayOfMonth: number, from: Date): Date {
  const day = clampDayOfMonth(dayOfMonth);
  const base = atMidnight(from);
  let candidate = new Date(base.getFullYear(), base.getMonth(), day);
  if (candidate < base) candidate = new Date(base.getFullYear(), base.getMonth() + 1, day);
  return candidate;
}

/** Số tháng (làm tròn lên) để trả hết `debtRemaining` với `monthlyAmount`/tháng. */
export function monthsToClear(debtRemaining: number, monthlyAmount: number): number {
  if (debtRemaining <= 0) return 0;
  if (monthlyAmount <= 0) return Infinity; // chưa đặt số tiền → không xác định
  return Math.ceil(debtRemaining / monthlyAmount);
}

/**
 * Số KỲ đã tới hạn tính đến `now` (kể từ kỳ đầu `startDate`), tối thiểu 0.
 * Dùng để ước lượng đáng lẽ đã phải trả bao nhiêu theo cam kết.
 */
export function duePeriods(plan: DebtPlanLike, now: Date): number {
  const day = clampDayOfMonth(plan.dayOfMonth);
  const start = atMidnight(plan.startDate);
  const cur = atMidnight(now);
  if (cur < new Date(start.getFullYear(), start.getMonth(), day)) {
    // chưa tới kỳ đầu tiên
    const monthDiff = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
    return Math.max(0, monthDiff);
  }
  const monthDiff = (cur.getFullYear() - start.getFullYear()) * 12 + (cur.getMonth() - start.getMonth());
  const passedThisMonth = cur.getDate() >= day ? 1 : 0;
  return Math.max(0, monthDiff + passedThisMonth);
}

/** Số tiền ĐÁNG LẼ đã phải trả tính tới `now` (theo cam kết, không vượt tổng nợ gốc). */
export function expectedPaidByNow(plan: DebtPlanLike, originalDebt: number, now: Date): number {
  const due = duePeriods(plan, now);
  return Math.min(Math.max(0, originalDebt), due * Math.max(0, plan.monthlyAmount));
}

export type DebtPlanStatus = {
  nextDue: Date; // kỳ trả kế tiếp
  monthsLeft: number; // số tháng còn lại để hết nợ (Infinity nếu chưa đặt tiền)
  finalDue: Date; // kỳ trả cuối (ước tính)
  behindAmount: number; // đang chậm bao nhiêu so với cam kết (0 = đúng hẹn)
  isBehind: boolean;
};

/**
 * Tổng hợp trạng thái kế hoạch để hiển thị.
 * - `debtRemaining`: công nợ còn lại hiện tại (CaseRecord.debtAmount).
 * - `paidSincePlan`: đã trả được bao nhiêu KỂ TỪ khi lập kế hoạch (để biết chậm/đúng hẹn).
 */
export function debtPlanStatus(
  plan: DebtPlanLike,
  opts: { debtRemaining: number; originalDebt: number; paidSincePlan: number; now: Date }
): DebtPlanStatus {
  const nextDue = nextDueDate(plan.dayOfMonth, opts.now);
  const monthsLeft = monthsToClear(opts.debtRemaining, plan.monthlyAmount);
  const finalDue =
    monthsLeft === Infinity || monthsLeft === 0
      ? nextDue
      : nextDueDate(plan.dayOfMonth, new Date(nextDue.getFullYear(), nextDue.getMonth() + (monthsLeft - 1), nextDue.getDate()));
  const expected = expectedPaidByNow(plan, opts.originalDebt, opts.now);
  const behindAmount = Math.max(0, expected - Math.max(0, opts.paidSincePlan));
  return { nextDue, monthsLeft, finalDue, behindAmount, isBehind: behindAmount > 0 };
}
