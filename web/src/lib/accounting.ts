// ============================================================================
// KẾ TOÁN — tổng hợp tài chính theo THÁNG.
//
// Bài toán: trước đây số liệu nằm rải rác 3 nơi (thực thu ở hồ sơ, chi vận hành
// ở Sổ thu chi, lương ở bảng Lương) và KHÔNG nối với nhau → cuối tháng phải cộng
// tay, dễ sai. File này gộp cả 3 về một bảng kết quả kinh doanh duy nhất.
//
// QUY TẮC CHỐNG TÍNH TRÙNG (quan trọng — mọi trang phải dùng chung):
//   1. Doanh thu dịch vụ  = tổng tiền khách ĐÃ TRẢ (Payment), KHÔNG lấy theo
//      giá trị hồ sơ (tránh tính cả phần còn nợ).
//   2. Hạng mục thu "Ứng từ doanh thu để chi trả" chỉ là LUÂN CHUYỂN tiền, không
//      phải thu nhập mới → loại khỏi "Thu khác".
//   3. Lương & hoa hồng cộng tác viên LUÔN lấy từ BẢNG LƯƠNG (nguồn đúng duy
//      nhất). Khi bấm "Ghi sổ chi lương", hệ thống sinh giao dịch chi hạng mục
//      SALARY / COMMISSION trong Sổ thu chi để theo dõi DÒNG TIỀN — các hạng mục
//      này bị LOẠI khỏi "Chi vận hành" để không bị cộng hai lần.
// ============================================================================

import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { REVENUE_TRANSFER_CODES, INVESTMENT_CATEGORY_CODE } from "@/lib/finance";
import { splitCashflow, computePnl, SALARY_CATEGORY, COMMISSION_CATEGORY } from "@/lib/pnl";

// Toán thuần (splitCashflow / computePnl) nằm ở `lib/pnl.ts` — NGUỒN DUY NHẤT cho
// Lãi/Lỗ, dùng chung với trang Báo cáo. Re-export để nơi khác import từ đâu cũng được.
export { splitCashflow, computePnl, SALARY_CATEGORY, COMMISSION_CATEGORY, PAYROLL_CATEGORIES } from "@/lib/pnl";
export type { PnlTxn, CashSplit, PnlInput, Pnl } from "@/lib/pnl";

// ------------------------------ Truy vấn CSDL ------------------------------

export type AccountingSummary = Awaited<ReturnType<typeof getMonthlyAccounting>>;

/**
 * Toàn bộ số liệu kế toán của một tháng (dùng cho trang /ke-toan và route xuất file).
 *
 * `canSeeInvestment`: "Chi phí đầu tư" (mã INVESTMENT) CHỈ Admin/Cổ đông được xem —
 * với người khác (kể cả Quản lý) phải ẩn HẲN khỏi mọi con số, y như Sổ thu chi, nếu
 * không sẽ lộ qua tổng chi / bảng chi theo hạng mục ở đây.
 */
export async function getMonthlyAccounting(
  monthDate: Date,
  standardDays = STANDARD_DAYS_DEFAULT,
  canSeeInvestment = true,
) {
  const gte = startOfMonth(monthDate);
  const lte = endOfMonth(monthDate);
  const monthKey = format(monthDate, "yyyy-MM");

  const [byMethod, cashRows, payroll, ctvPayouts, period, debtAll, debtMonth, topDebtors] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      where: { paidAt: { gte, lte } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.cashTransaction.findMany({
      where: {
        occurredAt: { gte, lte },
        ...(canSeeInvestment ? {} : { category: { not: INVESTMENT_CATEGORY_CODE } }),
      },
      select: { type: true, amount: true, category: true },
    }),
    getPayroll(monthDate, standardDays),
    prisma.commissionPayout.findMany({ where: { month: monthKey } }),
    prisma.accountingPeriod.findUnique({
      where: { month: monthKey },
      include: { closedBy: { select: { fullName: true } } },
    }),
    prisma.caseRecord.aggregate({ _sum: { debtAmount: true } }),
    prisma.caseRecord.aggregate({ where: { createdAt: { gte, lte } }, _sum: { debtAmount: true } }),
    prisma.caseRecord.findMany({
      where: { debtAmount: { gt: 0 } },
      orderBy: { debtAmount: "desc" },
      take: 8,
      select: {
        id: true,
        code: true,
        debtAmount: true,
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
      },
    }),
  ]);

  const revenueByMethod = byMethod
    .map((m) => ({ method: m.method, amount: toNum(m._sum.amount), count: m._count._all }))
    .sort((a, b) => b.amount - a.amount);
  const serviceRevenue = revenueByMethod.reduce((s, m) => s + m.amount, 0);

  const cash = splitCashflow(
    cashRows.map((t) => ({ type: t.type, category: t.category, amount: toNum(t.amount) })),
    REVENUE_TRANSFER_CODES,
  );

  // Lương & hoa hồng CTV — lấy từ bảng lương (phải trả), đối chiếu với đã chi.
  const salaryPayable = payroll.totalStaff;
  const salaryPaid = payroll.totalPaid;
  const ctvPayable = payroll.totalCtv;
  const paidCtv = new Map(ctvPayouts.map((p) => [p.name, toNum(p.amount)]));
  const ctvPaid = ctvPayouts.reduce((s, p) => s + toNum(p.amount), 0);

  const ctv = payroll.ctv.map((c) => ({
    name: c.name,
    amount: c.amount,
    paid: paidCtv.get(c.name) ?? 0,
    isPaid: paidCtv.has(c.name),
  }));

  const pnl = computePnl({
    serviceRevenue,
    otherIncome: cash.otherIncome,
    operatingExpense: cash.operatingExpense,
    salaryExpense: salaryPayable,
    ctvCommission: ctvPayable,
  });

  return {
    monthKey,
    from: gte,
    to: lte,
    standardDays,
    pnl,
    revenueByMethod,
    cash,
    payroll,
    ctv,
    salary: {
      payable: salaryPayable,
      paid: salaryPaid,
      remaining: Math.max(salaryPayable - salaryPaid, 0),
    },
    commission: {
      payable: ctvPayable,
      paid: ctvPaid,
      remaining: Math.max(ctvPayable - ctvPaid, 0),
    },
    debt: {
      outstanding: toNum(debtAll._sum.debtAmount), // tổng công nợ đến hiện tại
      newInMonth: toNum(debtMonth._sum.debtAmount), // nợ phát sinh từ hồ sơ mở trong tháng
      top: topDebtors.map((c) => ({
        id: c.id,
        code: c.code,
        debt: toNum(c.debtAmount),
        customer: c.customer,
      })),
    },
    period, // null = tháng chưa chốt sổ
    closed: !!period,
  };
}

/** Tháng "YYYY-MM" đã chốt sổ chưa (dùng để chặn ghi ở Sổ thu chi / bảng Lương). */
export async function isMonthClosed(month: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  const p = await prisma.accountingPeriod.findUnique({ where: { month }, select: { id: true } });
  return !!p;
}

/** Tháng của một mốc thời gian đã chốt sổ chưa. */
export async function isDateInClosedMonth(d: Date): Promise<boolean> {
  return isMonthClosed(format(d, "yyyy-MM"));
}
