import Link from "next/link";
import { Handshake, ChevronRight, Users, Wallet, Coins } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getCollaborators, getCollaboratorSeries, rangeBounds } from "@/lib/performance";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { MultiChart } from "@/components/ui/multi-chart";
import { RangeChart } from "@/components/ui/range-chart";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/ui/export-menu";
import { isShareholder } from "@/lib/rbac";
import { performanceTabs } from "@/lib/nav-tabs";
import { NewCollaboratorButton } from "./ctv-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cộng tác viên" };

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
];

export default async function CollaboratorsPage({ searchParams }: { searchParams: Promise<{ range?: string; filter?: string }> }) {
  const user = await requireCap("mod:cong-tac-vien");
  const canManage = !isShareholder(user.role);
  const sp = await searchParams;
  const range = sp.range ?? "month";
  const filter = sp.filter === "missing-id" || sp.filter === "unregistered" ? sp.filter : "all";
  const { gte, lte, label } = rangeBounds(range);
  const [rows, growth] = await Promise.all([getCollaborators(gte, lte), getCollaboratorSeries()]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalCustomers = rows.reduce((s, r) => s + r.customers, 0);
  const missingIdCount = rows.filter((r) => !r.id).length;
  const unregisteredCount = rows.filter((r) => Boolean(r.id) && !r.registered).length;
  const visibleRows = rows.filter((r) => filter === "missing-id" ? !r.id : filter === "unregistered" ? Boolean(r.id) && !r.registered : true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cộng tác viên"
        description="Hiệu suất cộng tác viên giới thiệu khách — doanh số mang về, số khách và hoa hồng. So sánh theo thời gian."
        icon={<Handshake className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              {RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/cong-tac-vien?range=${r.key}`}
                  className={`rounded-md px-3 py-1 ${range === r.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
            <ExportMenu excelHref={`/cong-tac-vien/export?format=xlsx&range=${range}`} wordHref={`/cong-tac-vien/export?format=doc&range=${range}`} />
            {canManage && <NewCollaboratorButton />}
          </div>
        }
      />

      <PageTabs tabs={performanceTabs(user)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Doanh số CTV · ${label}`} value={formatVND(totalRevenue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Tổng hoa hồng" value={formatVND(totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Tổng khách giới thiệu" value={totalCustomers} icon={<Users className="h-5 w-5" />} tone="brand" />
      </div>

      {/* Tăng trưởng doanh số CTV theo thời gian (tất cả CTV) */}
      <Card>
        <CardHeader>
          <CardTitle>Tăng trưởng doanh số cộng tác viên</CardTitle>
          <span className="text-sm text-slate-400">Tổng tất cả CTV · theo tuần / tháng / năm</span>
        </CardHeader>
        <CardContent>
          <RangeChart series={growth} valueLabel="Doanh số CTV" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
        <span className="font-semibold text-slate-600">Hàng chờ dữ liệu:</span>
        {([['all', `Tất cả (${rows.length})`], ['missing-id', `Thiếu ID (${missingIdCount})`], ['unregistered', `Chưa đăng ký (${unregisteredCount})`]] as const).map(([key, labelText]) => <Link key={key} href={`/cong-tac-vien?range=${range}&filter=${key}`} className={`rounded-md px-2.5 py-1.5 font-medium ${filter === key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"}`}>{labelText}</Link>)}
        <span className="ml-auto text-slate-400">Mọi số liệu vẫn lấy theo collaboratorId; legacy chỉ hiện để rà soát.</span>
      </div>

      {rows.some((r) => r.revenue > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>So sánh doanh số cộng tác viên · {label}</CardTitle>
            <span className="text-sm text-slate-400">Top 10 theo doanh số mang về</span>
          </CardHeader>
          <CardContent>
            <MultiChart
              data={rows.filter((r) => r.revenue > 0).slice(0, 10).map((r) => ({ label: r.name, value: r.revenue }))}
              types={["bar", "pie"]}
              defaultType="bar"
              valueLabel="Doanh số"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          {visibleRows.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-6 w-6" />}
              title={filter === "all" ? "Chưa có cộng tác viên trong kỳ này" : "Không có dòng phù hợp bộ lọc"}
              description="Không tự động gán CTV theo tên gần giống; hãy mở từng dòng legacy để xác nhận ID an toàn."
            />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Cộng tác viên</TH>
                  <TH className="text-center">Số khách</TH>
                  <TH className="text-center">Số ca</TH>
                  <TH className="text-right">Doanh số mang về</TH>
                  <TH className="text-right">Hoa hồng</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {visibleRows.map((r, i) => (
                  <TR key={r.id ?? `legacy:${r.name}`}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                        <Avatar name={r.name} className="h-8 w-8" />
                        <Link href={`/cong-tac-vien/${encodeURIComponent(r.id ?? r.name)}?range=${range}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">
                          {r.name}
                        </Link>
                        {!r.id && <Badge tone="red">Thiếu ID</Badge>}
                        {r.id && !r.registered && <Badge tone="amber">Chưa đăng ký</Badge>}
                      </div>
                    </TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.customers}</TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.cases}</TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(r.revenue)}</TD>
                    <TD className="text-right tabular-nums text-violet-600">{formatVND(r.commission)}</TD>
                    <TD className="text-right">
                      <Link href={`/cong-tac-vien/${encodeURIComponent(r.id ?? r.name)}?range=${range}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline">
                        Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
