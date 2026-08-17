// ============================================================================
// KẾ HOẠCH TRẢ NỢ (hẹn nợ) — toán THUẦN, không I/O, dễ kiểm thử.
//
// Khách công nợ cam kết: mỗi tháng vào "ngày X" trả "Y đồng" cho tới khi hết nợ.
// Các hàm dưới chỉ tính lịch + trạng thái từ tham số truyền vào — KHÔNG đọc DB.
// ============================================================================

export type DebtPlanLike = {
  dayOfMonth: number; // ngày trả hàng tháng (1..31 — tháng thiếu ngày tự lùi về ngày cuối tháng)
  monthlyAmount: number; // số tiền trả mỗi tháng (VND)
  startDate: Date; // mốc kỳ trả đầu tiên
};

/** Chuẩn hoá ngày trong tháng về 1..31. */
export function clampDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(day)));
}

const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Số ngày của tháng (month theo chuẩn JS 0..11). */
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** "Ngày X" của một tháng cụ thể — tháng thiếu ngày (29/30/31) thì lùi về ngày cuối tháng. */
export function dueDateInMonth(dayOfMonth: number, year: number, month: number): Date {
  const day = clampDayOfMonth(dayOfMonth);
  return new Date(year, month, Math.min(day, daysInMonth(year, month)));
}

/** Ngày đáo hạn KẾ TIẾP (đúng "ngày X" trong tháng) vào hoặc sau `from`. */
export function nextDueDate(dayOfMonth: number, from: Date): Date {
  const base = atMidnight(from);
  let candidate = dueDateInMonth(dayOfMonth, base.getFullYear(), base.getMonth());
  if (candidate < base) candidate = dueDateInMonth(dayOfMonth, base.getFullYear(), base.getMonth() + 1);
  return candidate;
}

/** Số tháng (làm tròn lên) để trả hết `debtRemaining` với `monthlyAmount`/tháng. */
export function monthsToClear(debtRemaining: number, monthlyAmount: number): number {
  if (debtRemaining <= 0) return 0;
  if (monthlyAmount <= 0) return Infinity; // chưa đặt số tiền → không xác định
  return Math.ceil(debtRemaining / monthlyAmount);
}

/**
 * Kỳ trả ĐẦU TIÊN thật sự: "ngày X" của tháng bắt đầu — TRỪ KHI ngày đó đã qua trước cả
 * `startDate` (vd lập kế hoạch ngày 17, hẹn trả vào ngày 5 hằng tháng — kỳ 05 của CHÍNH
 * tháng đó đã trôi qua trước khi kế hoạch tồn tại), khi đó kỳ đầu dời sang tháng kế tiếp.
 */
function firstDueDate(plan: DebtPlanLike): Date {
  const start = atMidnight(plan.startDate);
  const sameMonth = dueDateInMonth(plan.dayOfMonth, start.getFullYear(), start.getMonth());
  return sameMonth >= start ? sameMonth : dueDateInMonth(plan.dayOfMonth, start.getFullYear(), start.getMonth() + 1);
}

/**
 * Số KỲ đã tới hạn tính đến `now` (kể từ kỳ đầu — xem `firstDueDate`), tối thiểu 0.
 * Dùng để ước lượng đáng lẽ đã phải trả bao nhiêu theo cam kết.
 */
export function duePeriods(plan: DebtPlanLike, now: Date): number {
  const cur = atMidnight(now);
  const first = firstDueDate(plan);
  if (cur < first) return 0; // chưa tới kỳ đầu tiên
  const monthDiff = (cur.getFullYear() - first.getFullYear()) * 12 + (cur.getMonth() - first.getMonth());
  const passedThisMonth = cur >= dueDateInMonth(plan.dayOfMonth, cur.getFullYear(), cur.getMonth()) ? 1 : 0;
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
      : dueDateInMonth(plan.dayOfMonth, nextDue.getFullYear(), nextDue.getMonth() + (monthsLeft - 1));
  const expected = expectedPaidByNow(plan, opts.originalDebt, opts.now);
  const behindAmount = Math.max(0, expected - Math.max(0, opts.paidSincePlan));
  return { nextDue, monthsLeft, finalDue, behindAmount, isBehind: behindAmount > 0 };
}
