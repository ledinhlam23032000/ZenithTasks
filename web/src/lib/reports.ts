import { startOfDay, subDays, format } from "date-fns";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { monthRange, lastMonthRange, growthPct } from "@/lib/dates";

export type Reports = Awaited<ReturnType<typeof getReports>>;

export async function getReports() {
  const now = new Date();
  const month = monthRange(now);
  const last = lastMonthRange(now);
  const since14 = startOfDay(subDays(now, 13));

  const [payments14, revThis, revLast, topServicesRaw, sourceRaw, debtAgg, topDebtors, doctorGroups, doctors, casesThis, casesLast] =
    await Promise.all([
      prisma.payment.findMany({ where: { paidAt: { gte: since14 } }, select: { amount: true, paidAt: true } }),
      prisma.payment.aggregate({ where: { paidAt: month }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { paidAt: last }, _sum: { amount: true } }),
      prisma.caseService.groupBy({
        by: ["name"],
        where: { case: { createdAt: month } },
        _count: { _all: true },
        _sum: { finalPrice: true },
        orderBy: { _sum: { finalPrice: "desc" } },
        take: 8,
      }),
      prisma.customer.groupBy({ by: ["source"], _count: { _all: true } }),
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
    ]);

  // Doanh thu 14 ngày
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
    revenueSeries,
    revenue: { thisMonth: revenueThisMonth, lastMonth: revenueLastMonth, growth: growthPct(revenueThisMonth, revenueLastMonth) },
    cases: { thisMonth: casesThis, lastMonth: casesLast, growth: growthPct(casesThis, casesLast) },
    topServices: topServicesRaw.map((s) => ({ name: s.name, count: s._count._all, revenue: toNum(s._sum.finalPrice) })),
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
