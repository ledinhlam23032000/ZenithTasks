import { prisma } from "./db";
import { toNum } from "./money";
import { rfmScore, rfmSegment, funnelRates, marketingRoi, SEGMENTS, type Segment, type FunnelStep } from "./analytics";
import type { CustomerSource } from "@/generated/prisma/client";

// Các nguồn khách coi là "đến từ marketing" (để tính ROI marketing — C3).
const MARKETING_SOURCES: CustomerSource[] = ["MARKETING", "FACEBOOK", "ZALO", "TIKTOK", "HOTLINE"];

// ============================================================================
// LẮP RÁP SỐ LIỆU PHÂN TÍCH (Nhóm C) — truy vấn DB rồi dùng `analytics.ts` (thuần)
// để chấm điểm/quy phân khúc. KHÔNG đổi schema. Toán đặt ở `analytics.ts` (có test).
// ============================================================================

const CHURN_TAKE = 50;

export type ChurnCustomer = {
  id: string;
  fullName: string;
  phoneLast5: string | null;
  recencyDays: number;
  frequency: number;
  monetary: number;
};

export type SourceLtv = {
  source: CustomerSource;
  customers: number;
  revenue: number;
  ltv: number; // doanh thu / số khách
};

export type BusinessAnalytics = {
  days: number;
  totalCustomers: number; // khách đã có ít nhất 1 hồ sơ (không tính hồ sơ hủy)
  segCount: Record<Segment, number>;
  churn: ChurnCustomer[];
  caseFunnel: FunnelStep[];
  apptFunnel: FunnelStep[];
  bySource: SourceLtv[];
  marketing: { spend: number; revenue: number; roi: number | null }; // C3 — ROI marketing trong kỳ
};

export async function getBusinessAnalytics(days = 90): Promise<BusinessAnalytics> {
  const since = new Date(Date.now() - days * 86_400_000);

  // --- RFM theo từng khách (gộp toàn bộ lịch sử, bỏ hồ sơ hủy) ---
  const rfmRows = await prisma.$queryRaw<
    Array<{ id: string; fullName: string; phoneLast5: string | null; freq: bigint; monetary: string; last_at: Date }>
  >`
    SELECT c.id, c."fullName", c."phoneLast5",
           COUNT(cr.id) AS freq,
           COALESCE(SUM(cr."paidAmount"), 0) AS monetary,
           MAX(cr."createdAt") AS last_at
    FROM "Customer" c
    JOIN "CaseRecord" cr ON cr."customerId" = c.id AND cr.status <> 'CANCELLED'
    GROUP BY c.id, c."fullName", c."phoneLast5"`;

  const now = Date.now();
  const segCount: Record<Segment, number> = { champion: 0, loyal: 0, new: 0, at_risk: 0, hibernating: 0, others: 0 };
  const churn: ChurnCustomer[] = [];

  for (const r of rfmRows) {
    const recencyDays = Math.max(0, Math.floor((now - new Date(r.last_at).getTime()) / 86_400_000));
    const frequency = Number(r.freq);
    const monetary = toNum(r.monetary);
    const seg = rfmSegment(rfmScore({ recencyDays, frequency, monetary }));
    segCount[seg]++;
    if (seg === "at_risk") {
      churn.push({ id: r.id, fullName: r.fullName, phoneLast5: r.phoneLast5, recencyDays, frequency, monetary });
    }
  }
  // Khách nguy cơ rời bỏ: ưu tiên giá trị cao trước (kéo lại có lợi nhất).
  churn.sort((a, b) => b.monetary - a.monetary);
  const churnTop = churn.slice(0, CHURN_TAKE);

  // --- Phễu chuyển đổi trong kỳ ---
  const [casesTotal, consulted, agreed, paid, apptTotal, apptArrived] = await Promise.all([
    prisma.caseRecord.count({ where: { createdAt: { gte: since } } }),
    prisma.caseRecord.count({ where: { createdAt: { gte: since }, OR: [{ status: { not: "OPEN" } }, { consultResult: { not: "PENDING" } }] } }),
    prisma.caseRecord.count({ where: { createdAt: { gte: since }, consultResult: "AGREED" } }),
    prisma.caseRecord.count({ where: { createdAt: { gte: since }, paidAmount: { gt: 0 } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: since } } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: since }, arrivedAt: { not: null } } }),
  ]);

  const caseFunnel = funnelRates([
    { label: "Hồ sơ mở", count: casesTotal },
    { label: "Đã tư vấn", count: consulted },
    { label: "Chốt dịch vụ", count: agreed },
    { label: "Đã thu tiền", count: paid },
  ]);
  const apptFunnel = funnelRates([
    { label: "Lịch hẹn", count: apptTotal },
    { label: "Khách đã đến", count: apptArrived },
  ]);

  // --- LTV theo nguồn khách (toàn bộ lịch sử) ---
  const srcRows = await prisma.$queryRaw<Array<{ source: CustomerSource; customers: bigint; revenue: string }>>`
    SELECT c.source AS source,
           COUNT(DISTINCT c.id) AS customers,
           COALESCE(SUM(cr."paidAmount"), 0) AS revenue
    FROM "Customer" c
    LEFT JOIN "CaseRecord" cr ON cr."customerId" = c.id AND cr.status <> 'CANCELLED'
    GROUP BY c.source`;

  const bySource: SourceLtv[] = srcRows
    .map((r) => {
      const customers = Number(r.customers);
      const revenue = toNum(r.revenue);
      return { source: r.source, customers, revenue, ltv: customers > 0 ? Math.round(revenue / customers) : 0 };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- ROI marketing trong kỳ (C3): chi phí marketing (Sổ thu chi) vs tiền THỰC THU
  // từ khách thuộc nguồn marketing (theo ngày thu) ---
  const [spendAgg, mktRevAgg] = await Promise.all([
    prisma.cashTransaction.aggregate({
      where: { type: "EXPENSE", category: "MARKETING", occurredAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: since }, case: { customer: { source: { in: MARKETING_SOURCES } } } },
      _sum: { amount: true },
    }),
  ]);
  const mktSpend = toNum(spendAgg._sum.amount);
  const mktRevenue = toNum(mktRevAgg._sum.amount);

  return {
    marketing: { spend: mktSpend, revenue: mktRevenue, roi: marketingRoi(mktRevenue, mktSpend) },
    days,
    totalCustomers: rfmRows.length,
    segCount,
    churn: churnTop,
    caseFunnel,
    apptFunnel,
    bySource,
  };
}

export { SEGMENTS };
