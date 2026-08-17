import { prisma } from "./db";
import { toNum } from "./money";
import { loadCaseFinancials } from "./financial-summary-db";
import { fmtDate } from "./format";
import { getBusinessAnalytics } from "./analytics-data";
import { summarizeLeads, type LeadStatusKey } from "./leads";
import type { AssistantContext } from "./assistant";

// ============================================================================
// Lắp ráp "ảnh chụp" số liệu cho trợ lý AI (D1). Tổng hợp số liệu KINH DOANH —
// KHÔNG gồm SĐT / dữ liệu y khoa. Tái dùng getBusinessAnalytics (RFM/churn/ROI).
// ============================================================================

const PERIOD = 30;

export async function getAssistantContext(): Promise<AssistantContext> {
  const now = new Date();
  const since = new Date(now.getTime() - PERIOD * 86_400_000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const in7 = new Date(now.getTime() + 7 * 86_400_000);

  const [analytics, revenueAgg, newCustomers, newCases, apptToday, followUps7, debtCases, topServicesRows, materials, leadRows] =
    await Promise.all([
      getBusinessAnalytics(PERIOD),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: since } } }),
      prisma.customer.count({ where: { createdAt: { gte: since } } }),
      prisma.caseRecord.count({ where: { createdAt: { gte: since } } }),
      prisma.appointment.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } } }),
      prisma.followUp.count({ where: { scheduledAt: { gte: now, lte: in7 } } }),
      prisma.caseRecord.findMany({
        where: {},
        select: { id: true, customer: { select: { fullName: true } } },
      }),
      prisma.$queryRaw<Array<{ name: string; cnt: bigint; rev: string }>>`
        SELECT cs.name, COUNT(*)::bigint AS cnt, COALESCE(SUM(cs."finalPrice"), 0) AS rev
        FROM "CaseService" cs JOIN "CaseRecord" cr ON cr.id = cs."caseId"
        WHERE cr."createdAt" >= ${since} AND cr.status <> 'CANCELLED'
        GROUP BY cs.name ORDER BY cnt DESC, rev DESC LIMIT 5`,
      prisma.material.findMany({ where: { active: true }, select: { name: true, stock: true, minStock: true, unit: true } }),
      prisma.lead.findMany({ select: { status: true } }),
    ]);

  const lowStock = materials
    .map((m) => ({ name: m.name, stock: toNum(m.stock), minStock: toNum(m.minStock), unit: m.unit }))
    .filter((m) => m.minStock > 0 && m.stock <= m.minStock)
    .slice(0, 10);

  const leads = summarizeLeads(leadRows.map((l) => ({ status: l.status as LeadStatusKey })));
  const debtFinancials = await loadCaseFinancials(debtCases.map((c) => c.id));
  const debtRows = debtCases
    .map((c) => ({ ...c, debt: debtFinancials.get(c.id)?.debt ?? 0 }))
    .filter((c) => c.debt > 0)
    .sort((a, b) => b.debt - a.debt);

  return {
    today: fmtDate(now),
    periodDays: PERIOD,
    revenue: toNum(revenueAgg._sum.amount ?? 0),
    newCustomers,
    newCases,
    appointmentsToday: apptToday,
    followUpsNext7: followUps7,
    debtTotal: debtRows.reduce((s, d) => s + d.debt, 0),
    debtCount: debtRows.length,
    topDebtors: debtRows.slice(0, 5).map((d) => ({ name: d.customer.fullName, amount: d.debt })),
    topServices: topServicesRows.map((s) => ({ name: s.name, count: Number(s.cnt), revenue: toNum(s.rev) })),
    segments: analytics.segCount,
    churnRiskCount: analytics.churn.length,
    churnTop: analytics.churn.slice(0, 5).map((c) => ({ name: c.fullName, monetary: c.monetary, recencyDays: c.recencyDays })),
    lowStock,
    leads: { total: leads.total, open: leads.open, converted: leads.byStatus.CONVERTED, conversionRate: leads.conversionRate },
    marketing: analytics.marketing,
  };
}
