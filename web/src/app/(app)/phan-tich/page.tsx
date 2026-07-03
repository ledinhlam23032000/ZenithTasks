import Link from "next/link";
import { PieChart, Users, AlertTriangle, Crown, Filter, Megaphone, Star } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { formatVND, formatVNDShort } from "@/lib/money";
import { SOURCE_LABEL } from "@/lib/status";
import { getBusinessAnalytics } from "@/lib/analytics-data";
import { SEGMENTS, type Segment } from "@/lib/analytics";
import { tplWinback } from "@/lib/message-templates";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactButtons } from "@/components/ui/contact-buttons";
import { reportTabs } from "@/lib/nav-tabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Phân tích kinh doanh" };

const SEGMENT_META: Record<Segment, { label: string; tone: Tone; desc: string }> = {
  champion: { label: "Khách VIP", tone: "green", desc: "Gần đây + chi nhiều/thường xuyên" },
  loyal: { label: "Trung thành", tone: "blue", desc: "Quay lại nhiều lần" },
  new: { label: "Khách mới", tone: "purple", desc: "Mới đến gần đây" },
  at_risk: { label: "Nguy cơ rời bỏ", tone: "red", desc: "Từng giá trị cao, lâu chưa quay lại" },
  hibernating: { label: "Đang ngủ", tone: "slate", desc: "Lâu chưa quay lại, giá trị thấp" },
  others: { label: "Khác", tone: "amber", desc: "Chưa rõ nhóm" },
};

const RANGES = [
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
  { days: 180, label: "6 tháng" },
  { days: 365, label: "1 năm" },
];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await requireCap("mod:phan-tich");
  const sp = await searchParams;
  const days = RANGES.some((r) => String(r.days) === sp.days) ? Number(sp.days) : 90;

  const a = await getBusinessAnalytics(days);

  const agreedRate = a.caseFunnel[0]?.count ? Math.round((a.caseFunnel[2].count / a.caseFunnel[0].count) * 100) : 0;
  const segMax = Math.max(1, ...SEGMENTS.map((s) => a.segCount[s]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân tích kinh doanh"
        description="Phễu chuyển đổi, phân khúc khách (RFM), radar khách rời bỏ và giá trị theo nguồn — để chủ động ra quyết định."
        icon={<PieChart className="h-5 w-5" />}
        actions={
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {RANGES.map((r) => (
              <Link
                key={r.days}
                href={`/phan-tich?days=${r.days}`}
                className={`rounded-md px-3 py-1 ${days === r.days ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <PageTabs tabs={reportTabs(user)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Khách có hồ sơ" value={String(a.totalCustomers)} sub="Đã từng làm dịch vụ" icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label="Khách VIP" value={String(a.segCount.champion)} sub="Nhóm giá trị cao nhất" icon={<Crown className="h-5 w-5" />} tone="green" />
        <StatCard label="Nguy cơ rời bỏ" value={String(a.segCount.at_risk)} sub="Cần chủ động kéo lại" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
        <StatCard label="Tỉ lệ chốt" value={`${agreedRate}%`} sub={`Chốt / hồ sơ mở (${days} ngày)`} icon={<Filter className="h-5 w-5" />} tone="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phễu chuyển đổi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-brand-500" /> Phễu chuyển đổi ({days} ngày)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FunnelBars steps={a.caseFunnel} />
            <div className="border-t border-dashed border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch hẹn → Đến</p>
              <FunnelBars steps={a.apptFunnel} tone="sky" />
            </div>
          </CardContent>
        </Card>

        {/* Phân khúc RFM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-500" /> Phân khúc khách (RFM)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {SEGMENTS.map((s) => {
              const meta = SEGMENT_META[s];
              const n = a.segCount[s];
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${BAR_BG[meta.tone]}`} style={{ width: `${(n / segMax) * 100}%` }} />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{n}</div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-slate-400">
              RFM = Gần đây (Recency) · Số lần (Frequency) · Tổng chi (Monetary). Ngưỡng mặc định có thể tinh chỉnh trong mã (`lib/analytics.ts`).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Marketing (C3) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-brand-500" /> ROI Marketing ({days} ngày)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Chi phí marketing</p>
              <p className="mt-0.5 text-lg font-bold text-rose-600">{formatVND(a.marketing.spend)}</p>
              <p className="text-xs text-slate-400">Từ Sổ thu chi (mục Marketing)</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Doanh thu nguồn marketing</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-600">{formatVND(a.marketing.revenue)}</p>
              <p className="text-xs text-slate-400">Tiền thực thu từ khách nguồn MKT/FB/Zalo/TikTok/Hotline</p>
            </div>
            <div className="rounded-xl bg-brand-50 px-4 py-3">
              <p className="text-xs text-brand-700">ROI</p>
              <p className="mt-0.5 text-lg font-bold text-brand-700">
                {a.marketing.roi !== null ? `${a.marketing.roi.toLocaleString("vi-VN")} lần` : "—"}
              </p>
              <p className="text-xs text-brand-600/70">
                {a.marketing.roi !== null ? `1đ chi marketing → ${a.marketing.roi.toLocaleString("vi-VN")}đ thu về` : "Chưa ghi chi phí marketing"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Lưu ý: cần ghi chi phí marketing ở <b>Sổ thu chi</b> (mục “Marketing &amp; quảng cáo”) thì ROI mới chính xác.
            Doanh thu tính theo tiền thực thu trong kỳ từ khách thuộc nhóm nguồn marketing.
          </p>
        </CardContent>
      </Card>

      {/* NPS — đánh giá trải nghiệm khách (D3 gđ2) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" /> Đánh giá trải nghiệm — NPS ({days} ngày)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {a.nps.count === 0 ? (
            <p className="text-sm text-slate-400">Chưa có đánh giá nào trong kỳ. Khách tự đánh giá từ cổng khách hàng (link riêng).</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-50 px-4 py-3">
                <p className="text-xs text-brand-700">Điểm NPS</p>
                <p className="mt-0.5 text-2xl font-bold text-brand-700">{a.nps.score}</p>
                <p className="text-xs text-brand-600/70">{a.nps.count} lượt · TB {a.nps.average}/10</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-700">Hài lòng (9–10)</p>
                <p className="mt-0.5 text-lg font-bold text-emerald-600">{a.nps.promoters}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Bình thường (7–8)</p>
                <p className="mt-0.5 text-lg font-bold text-slate-600">{a.nps.passives}</p>
              </div>
              <div className="rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-xs text-rose-700">Chưa hài lòng (0–6)</p>
                <p className="mt-0.5 text-lg font-bold text-rose-600">{a.nps.detractors}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Radar khách rời bỏ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" /> Radar khách nguy cơ rời bỏ ({a.churn.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {a.churn.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Chưa có khách nguy cơ rời bỏ" description="Các khách từng giá trị cao mà lâu chưa quay lại sẽ hiện ở đây để chủ động mời lại." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Khách hàng</TH>
                  <TH className="text-center">Số lần</TH>
                  <TH className="text-right">Đã chi</TH>
                  <TH className="text-center">Lần cuối</TH>
                  <TH>Liên hệ mời lại</TH>
                </TR>
              </THead>
              <tbody>
                {a.churn.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/khach-hang/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {c.fullName}
                      </Link>
                    </TD>
                    <TD className="text-center tabular-nums text-slate-600">{c.frequency}</TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(c.monetary)}</TD>
                    <TD className="text-center">
                      <Badge tone={c.recencyDays >= 180 ? "red" : "amber"}>{c.recencyDays} ngày</Badge>
                    </TD>
                    <TD>
                      <ContactButtons customerId={c.id} last5={c.phoneLast5} smsBody={tplWinback({ fullName: c.fullName })} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* LTV theo nguồn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-brand-500" /> Giá trị khách theo nguồn (LTV)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <THead>
              <TR>
                <TH>Nguồn khách</TH>
                <TH className="text-center">Số khách</TH>
                <TH className="text-right">Tổng doanh thu</TH>
                <TH className="text-right">LTV / khách</TH>
              </TR>
            </THead>
            <tbody>
              {a.bySource.map((s) => (
                <TR key={s.source}>
                  <TD className="font-medium text-slate-800">{SOURCE_LABEL[s.source]}</TD>
                  <TD className="text-center tabular-nums text-slate-600">{s.customers}</TD>
                  <TD className="text-right tabular-nums text-slate-700">{formatVNDShort(s.revenue)}</TD>
                  <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(s.ltv)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const BAR_BG: Record<Tone, string> = {
  brand: "bg-brand-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-violet-500",
  red: "bg-rose-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
  pink: "bg-pink-500",
};

function FunnelBars({ steps, tone = "brand" }: { steps: { label: string; count: number; pctOfTop: number; pctOfPrev: number }[]; tone?: "brand" | "sky" }) {
  const fill = tone === "sky" ? "bg-sky-500" : "bg-brand-500";
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{s.label}</span>
            <span className="tabular-nums text-slate-500">
              <b className="text-slate-800">{s.count}</b>
              {i > 0 && <span className="ml-2 text-xs text-slate-400">{s.pctOfPrev}% so với bước trước</span>}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(s.pctOfTop, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
