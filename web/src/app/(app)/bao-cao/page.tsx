import Link from "next/link";
import { TrendingUp, Target, Receipt, Stethoscope, Sparkles, PieChart, ShieldCheck, ArrowUpRight, ArrowDownRight, Scale, Coins } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/dashboard";
import { getReports, getSalesSeries, getMonthlyPnl } from "@/lib/reports";
import { formatVND, formatVNDShort } from "@/lib/money";
import { maskPhone } from "@/lib/phone";
import { SOURCE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { MultiChart } from "@/components/ui/multi-chart";
import { SalesChart } from "./sales-chart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Báo cáo" };

export default async function ReportsPage() {
  await requireCap("mod:bao-cao");
  const [d, r, sales, pnl] = await Promise.all([getAdminDashboard(), getReports(), getSalesSeries(), getMonthlyPnl()]);

  const maxSource = Math.max(...r.sources.map((s) => s.count), 1);
  const monthLabel = new Date().toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo &amp; phân tích"
        description="Doanh thu, tăng trưởng, hiệu suất nhân viên và công nợ của phòng khám."
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<ExportMenu excelHref="/bao-cao/export?format=xlsx" wordHref="/bao-cao/export?format=doc" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doanh thu tháng này"
          value={formatVNDShort(r.revenue.thisMonth)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="brand"
          trend={{ value: r.revenue.growth, label: `Tháng trước: ${formatVND(r.revenue.lastMonth)}` }}
        />
        <StatCard
          label="Số ca tháng này"
          value={r.cases.thisMonth}
          icon={<Stethoscope className="h-5 w-5" />}
          tone="blue"
          trend={{ value: r.cases.growth, label: "So với tháng trước" }}
        />
        <StatCard
          label="Tỉ lệ chốt tư vấn"
          value={`${d.consultRate.rate}%`}
          sub={`${d.consultRate.agreed}/${d.consultRate.total} ca`}
          icon={<Target className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Công nợ tồn" value={formatVNDShort(r.outstandingDebt)} icon={<Receipt className="h-5 w-5" />} tone="red" />
      </div>

      {/* Lãi / Lỗ tháng (chuyển từ Sổ thu chi sang đây — chỉ quản trị/quản lý/cổ đông xem) */}
      <Card>
        <CardHeader>
          <CardTitle>Lãi / Lỗ tháng {monthLabel}</CardTitle>
          <span className="text-sm text-slate-400">Doanh thu dịch vụ + thu khác − tổng chi</span>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Doanh thu dịch vụ" value={formatVND(pnl.serviceRevenue)} sub="Tiền thực thu từ hồ sơ" icon={<ArrowUpRight className="h-5 w-5" />} tone="green" />
            <StatCard label="Thu khác" value={formatVND(pnl.otherIncome)} sub="Ghi ở sổ thu chi" icon={<Coins className="h-5 w-5" />} tone="brand" />
            <StatCard label="Tổng chi" value={formatVND(pnl.totalExpense)} sub="Chi phí vận hành" icon={<ArrowDownRight className="h-5 w-5" />} tone="pink" />
            <StatCard label="Lãi / Lỗ" value={formatVND(pnl.profit)} sub="Doanh thu + thu khác − chi" icon={<Scale className="h-5 w-5" />} tone={pnl.profit >= 0 ? "brand" : "red"} />
          </div>
        </CardContent>
      </Card>

      {/* Doanh số tư vấn theo thời gian (cột + đường xu hướng) */}
      <Card>
        <CardHeader>
          <CardTitle>Doanh số tư vấn theo thời gian</CardTitle>
          <span className="text-sm text-slate-400">Giá trị hồ sơ chốt · so sánh 7 ngày / 12 tháng / 5 năm</span>
        </CardHeader>
        <CardContent>
          <SalesChart d7={sales.d7} thisWeek={sales.thisWeek} weeksOfMonth={sales.weeksOfMonth} m12={sales.m12} y5={sales.y5} />
        </CardContent>
      </Card>

      {/* Biểu đồ doanh thu */}
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu 14 ngày gần nhất</CardTitle>
          <span className="text-sm text-slate-400">Tiền thực thu theo ngày</span>
        </CardHeader>
        <CardContent>
          <MultiChart data={r.revenueSeries} valueLabel="Doanh thu" defaultType="bar" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hiệu suất tư vấn */}
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất tư vấn viên (tháng)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {d.consultants.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Nhân viên</TH>
                    <TH className="text-center">Ca</TH>
                    <TH className="text-center">Chốt</TH>
                    <TH className="text-right">Doanh thu</TH>
                  </TR>
                </THead>
                <tbody>
                  {d.consultants.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        {c.id === "none" ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={c.name} className="h-7 w-7 text-[10px]" /> <span className="font-medium text-slate-500">{c.name}</span>
                          </div>
                        ) : (
                          <Link href={`/hieu-suat/${c.id}`} className="flex items-center gap-2 group">
                            <Avatar name={c.name} className="h-7 w-7 text-[10px]" />{" "}
                            <span className="font-medium text-slate-800 group-hover:text-brand-600 group-hover:underline">{c.name}</span>
                          </Link>
                        )}
                      </TD>
                      <TD className="text-center">{c.consults}</TD>
                      <TD className="text-center">
                        <Badge tone={c.rate >= 60 ? "green" : c.rate >= 40 ? "amber" : "red"}>{c.rate}%</Badge>
                      </TD>
                      <TD className="text-right font-semibold text-slate-800">{formatVND(c.revenue)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Năng suất bác sĩ */}
        <Card>
          <CardHeader>
            <CardTitle>Năng suất bác sĩ (tháng)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {r.doctors.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Bác sĩ</TH>
                    <TH className="text-center">Số ca</TH>
                    <TH className="text-right">Doanh thu</TH>
                  </TR>
                </THead>
                <tbody>
                  {r.doctors.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/hieu-suat/${c.id}`} className="flex items-center gap-2 group">
                          <Avatar name={c.name} className="h-7 w-7 text-[10px]" />{" "}
                          <span className="font-medium text-slate-800 group-hover:text-brand-600 group-hover:underline">{c.name}</span>
                        </Link>
                      </TD>
                      <TD className="text-center">{c.cases}</TD>
                      <TD className="text-right font-semibold text-slate-800">{formatVND(c.revenue)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top dịch vụ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-500" /> Dịch vụ nổi bật (tháng)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {r.topServices.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <ul className="space-y-2.5">
                {r.topServices.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium text-slate-700">{s.name}</span>
                    <span className="text-xs text-slate-400">{s.count} lượt</span>
                    <span className="w-28 text-right text-sm font-semibold text-slate-800">{formatVND(s.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Nguồn khách */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-brand-500" /> Phân bổ nguồn khách
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2.5">
              {r.sources.map((s) => (
                <li key={s.source}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{SOURCE_LABEL[s.source]}</span>
                    <span className="font-medium text-slate-700">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Công nợ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-rose-500" /> Công nợ cần thu
          </CardTitle>
          <span className="text-sm font-semibold text-rose-600">{formatVND(r.outstandingDebt)}</span>
        </CardHeader>
        <CardContent className="pt-0">
          {r.topDebtors.length === 0 ? (
            <EmptyState title="Không có công nợ" description="Tất cả hồ sơ đã thanh toán đủ." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {r.topDebtors.map((dbt) => (
                <li key={dbt.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={dbt.customer.fullName} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/khach-hang/${dbt.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                      {dbt.customer.fullName}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {dbt.customer.code} · <ShieldCheck className="inline h-3 w-3" /> {maskPhone(dbt.customer.phoneLast5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold text-rose-600">{formatVND(dbt.debt)}</span>
                    <Link href={`/ho-so/${dbt.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                      Mở hồ sơ thu nợ →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
