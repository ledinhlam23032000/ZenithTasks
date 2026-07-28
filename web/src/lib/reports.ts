import { startOfDay, subDays, subMonths, subYears, startOfYear, startOfWeek, startOfMonth, endOfMonth, addDays, getDate, format } from "date-fns";
import { vi } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { monthRange, lastMonthRange, growthPct } from "@/lib/dates";
import { getMonthlyAccounting } from "@/lib/accounting";

/**
 * Lãi/Lỗ của 1 tháng bất kỳ. Dùng CHUNG một phép tính với trang Kế toán
 * (`getMonthlyAccounting` → toán thuần ở `lib/pnl.ts`) để hai trang không bao giờ
 * ra số khác nhau: doanh thu thực thu + thu khác − chi vận hành − lương − hoa hồng CTV.
 * (Trước đây hàm này KHÔNG trừ lương nên Lãi/Lỗ bị thổi phồng.)
 */
export async function getMonthlyPnl(monthDate = new Date(), canSeeInvestment = true) {
  const a = await getMonthlyAccounting(monthDate, undefined, canSeeInvestment);
  return a.pnl;
}

export type SalesPoint = { label: string; value: number };

/**
 * Doanh số tư vấn (giá trị hồ sơ chốt) theo 3 mốc thời gian để so sánh:
 * 7 ngày gần nhất, 12 tháng gần nhất, 5 năm gần nhất.
 */
export async function getSalesSeries() {
  const now = new Date();
  const since = startOfYear(subYears(now, 4)); // bao trùm cả 3 mốc
  const cases = await prisma.caseRecord.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, totalAmount: true },
  });

  function build(keys: { key: string; label: string }[], keyOf: (d: Date) => string): SalesPoint[] {
    const m = new Map(keys.map((k) => [k.key, 0]));
    for (const c of cases) {
      const k = keyOf(c.createdAt);
      if (m.has(k)) m.set(k, (m.get(k) ?? 0) + toNum(c.totalAmount));
    }
    return keys.map((k) => ({ label: k.label, value: m.get(k.key) ?? 0 }));
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(now, 6 - i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "dd/MM") };
  });
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MM/yy") };
  });
  const years = Array.from({ length: 5 }, (_, i) => {
    const d = subYears(now, 4 - i);
    return { key: format(d, "yyyy"), label: format(d, "yyyy") };
  });

  // Tuần này (T2..CN)
  const ws = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEEEEE dd/MM", { locale: vi }) };
  });

  // Các tuần trong tháng này (Tuần 1..N)
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const weekCount = Math.ceil(getDate(mEnd) / 7);
  const weeksOfMonth: SalesPoint[] = Array.from({ length: weekCount }, (_, i) => ({ label: `Tuần ${i + 1}`, value: 0 }));
  for (const c of cases) {
    if (c.createdAt >= mStart && c.createdAt <= mEnd) {
      const wi = Math.floor((getDate(c.createdAt) - 1) / 7);
      if (weeksOfMonth[wi]) weeksOfMonth[wi].value += toNum(c.totalAmount);
    }
  }

  return {
    d7: build(days, (d) => format(d, "yyyy-MM-dd")),
    thisWeek: build(weekDays, (d) => format(d, "yyyy-MM-dd")),
    weeksOfMonth,
    m12: build(months, (d) => format(d, "yyyy-MM")),
    y5: build(years, (d) => format(d, "yyyy")),
  };
}

export type Reports = Awaited<ReturnType<typeof getReports>>;

/** Báo cáo của 1 tháng bất kỳ (mặc định tháng hiện tại). "Tháng trước" luôn là tháng liền trước `monthDate`. */
export async function getReports(monthDate = new Date()) {
  const now = new Date();
  const isCurrentMonth = format(monthDate, "yyyy-MM") === format(now, "yyyy-MM");
  const month = monthRange(monthDate);
  const last = lastMonthRange(monthDate);
  const since14 = startOfDay(subDays(now, 13));

  const [payments14, revThis, revLast, topServicesRaw, sourceRaw, debtAgg, topDebtors, doctorGroups, doctors, casesThis, casesLast, agreedThis] =
    await Promise.all([
      // Biểu đồ "14 ngày gần nhất" chỉ có ý nghĩa khi xem tháng hiện tại — tháng quá khứ thì bỏ trống.
      isCurrentMonth
        ? prisma.payment.findMany({ where: { paidAt: { gte: since14 } }, select: { amount: true, paidAt: true } })
        : Promise.resolve([]),
      prisma.payment.aggregate({ where: { paidAt: month }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { paidAt: last }, _sum: { amount: true } }),
      prisma.caseService.groupBy({
        by: ["name"],
        where: { case: { createdAt: month } },
        _count: { _all: true },
        _sum: { finalPrice: true },
      }),
      // Nguồn khách PHẢI lọc theo tháng (khách tạo trong tháng) — trước đây đếm toàn bộ lịch sử, sai khi xem theo tháng.
      prisma.customer.groupBy({ by: ["source"], where: { createdAt: month }, _count: { _all: true } }),
      prisma.caseRecord.aggregate({ _sum: { debtAmount: true } }),
      prisma.caseRecord.findMany({
        where: { debtAmount: { gt: 0 } },
        orderBy: { debtAmount: "desc" },
        take: 6,
        include: { customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } } },
      }),
      prisma.caseRecord.groupBy({
        by: ["doctorId"],
        where: { createdAt: month, doctorId: { not: null }, consultResult: "AGREED" },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.user.findMany({ where: { role: "DOCTOR" }, select: { id: true, fullName: true } }),
      prisma.caseRecord.count({ where: { createdAt: month } }),
      prisma.caseRecord.count({ where: { createdAt: last } }),
      prisma.caseRecord.count({ where: { createdAt: month, consultResult: "AGREED" } }),
    ]);

  // Doanh thu 14 ngày (chỉ tháng hiện tại)
  const buckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    buckets.set(format(subDays(now, i), "yyyy-MM-dd"), 0);
  }
  for (const p of payments14) {
    const key = format(p.paidAt, "yyyy-MM-dd");
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + toNum(p.amount));
  }
  const revenueSeries = [...buckets.entries()].map(([d, v]) => ({ label: format(new Date(d), "dd/MM"), value: v }));

  const nameMap = new Map(doctors.map((d) => [d.id, d.fullName]));

  const revenueThisMonth = toNum(revThis._sum.amount);
  const revenueLastMonth = toNum(revLast._sum.amount);

  return {
    isCurrentMonth,
    revenueSeries,
    revenue: { thisMonth: revenueThisMonth, lastMonth: revenueLastMonth, growth: growthPct(revenueThisMonth, revenueLastMonth) },
    cases: { thisMonth: casesThis, lastMonth: casesLast, growth: growthPct(casesThis, casesLast) },
    consultRate: { total: casesThis, agreed: agreedThis, rate: casesThis > 0 ? Math.round((agreedThis / casesThis) * 100) : 0 },
    topServices: topServicesRaw
      .map((s) => ({ name: s.name, count: s._count._all, revenue: toNum(s._sum.finalPrice) }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue) // xếp theo SỐ LƯỢT, rồi doanh thu
      .slice(0, 8),
    sources: sourceRaw.map((s) => ({ source: s.source, count: s._count._all })).sort((a, b) => b.count - a.count),
    outstandingDebt: toNum(debtAgg._sum.debtAmount),
    topDebtors: topDebtors.map((c) => ({
      id: c.id,
      customer: c.customer,
      debt: toNum(c.debtAmount),
    })),
    doctors: doctorGroups
      .map((g) => ({
        id: g.doctorId as string,
        name: nameMap.get(g.doctorId as string) ?? "—",
        cases: g._count._all,
        revenue: toNum(g._sum.totalAmount),
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
