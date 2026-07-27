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
import { REVENUE_TRANSFER_CODES } from "@/lib/finance";

/** Hạng mục chi do trang Kế toán sinh ra khi ghi sổ chi lương / hoa hồng CTV. */
export const SALARY_CATEGORY = "SALARY";
export const COMMISSION_CATEGORY = "COMMISSION";
export const PAYROLL_CATEGORIES: string[] = [SALARY_CATEGORY, COMMISSION_CATEGORY];

// ------------------------------ Phần tính thuần ------------------------------
// (tách riêng, không đụng CSDL, để kiểm thử được bằng vitest)

export type CashRow = { type: "INCOME" | "EXPENSE"; category: string; amount: number };

export type CashSplit = {
  otherIncome: number; // Thu khác (đã bỏ khoản ứng từ doanh thu)
  transferIn: number; // Ứng từ doanh thu để chi trả (luân chuyển)
  operatingExpense: number; // Chi vận hành — KHÔNG gồm lương & hoa hồng CTV
  salaryPosted: number; // Chi lương đã ghi trong sổ thu chi
  commissionPosted: number; // Chi hoa hồng CTV đã ghi trong sổ thu chi
  expenseByCategory: { code: string; amount: number }[]; // xếp giảm dần (gồm cả lương/HH)
};

/** Bóc tách các dòng Sổ thu chi trong tháng theo đúng quy tắc chống tính trùng. */
export function splitCashflow(rows: CashRow[]): CashSplit {
  let otherIncome = 0;
  let transferIn = 0;
  let operatingExpense = 0;
  let salaryPosted = 0;
  let commissionPosted = 0;
  const byCat = new Map<string, number>();

  for (const r of rows) {
    const a = r.amount;
    if (r.type === "INCOME") {
      if (REVENUE_TRANSFER_CODES.includes(r.category)) transferIn += a;
      else otherIncome += a;
      continue;
    }
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + a);
    if (r.category === SALARY_CATEGORY) salaryPosted += a;
    else if (r.category === COMMISSION_CATEGORY) commissionPosted += a;
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
  salaryExpense: number;
  ctvCommission: number;
};

export type Pnl = PnlInput & {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  margin: number; // % lãi trên tổng thu (làm tròn)
};

/** Kết quả kinh doanh tháng: tổng thu − tổng chi. */
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

// ------------------------------ Truy vấn CSDL ------------------------------

export type AccountingSummary = Awaited<ReturnType<typeof getMonthlyAccounting>>;

/** Toàn bộ số liệu kế toán của một tháng (dùng cho trang /ke-toan và route xuất file). */
export async function getMonthlyAccounting(monthDate: Date, standardDays = STANDARD_DAYS_DEFAULT) {
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
      where: { occurredAt: { gte, lte } },
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
