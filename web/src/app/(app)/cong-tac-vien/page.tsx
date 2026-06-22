import Link from "next/link";
import { Handshake, ChevronRight, Users, Wallet, Coins } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getCollaborators, rangeBounds } from "@/lib/performance";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cộng tác viên" };

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
];

export default async function CollaboratorsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireCap("mod:cong-tac-vien");
  const range = (await searchParams).range ?? "month";
  const { gte, lte, label } = rangeBounds(range);
  const rows = await getCollaborators(gte, lte);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const totalCustomers = rows.reduce((s, r) => s + r.customers, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cộng tác viên"
        description="Hiệu suất cộng tác viên giới thiệu khách — doanh số mang về, số khách và hoa hồng. So sánh theo thời gian."
        icon={<Handshake className="h-5 w-5" />}
        actions={
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
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Doanh số CTV · ${label}`} value={formatVND(totalRevenue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Tổng hoa hồng" value={formatVND(totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Tổng khách giới thiệu" value={totalCustomers} icon={<Users className="h-5 w-5" />} tone="brand" />
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-6 w-6" />}
              title="Chưa có cộng tác viên trong kỳ này"
              description="CTV được ghi nhận khi khách có Nguồn = Cộng tác viên và điền tên ở 'Chi tiết nguồn'."
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
                {rows.map((r, i) => (
                  <TR key={r.name}>
                    <TD>
                      <Link href={`/cong-tac-vien/${encodeURIComponent(r.name)}?range=${range}`} className="flex items-center gap-2.5 group">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                        <Avatar name={r.name} className="h-8 w-8" />
                        <span className="font-medium text-slate-800 group-hover:text-brand-600 group-hover:underline">{r.name}</span>
                      </Link>
                    </TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.customers}</TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.cases}</TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(r.revenue)}</TD>
                    <TD className="text-right tabular-nums text-violet-600">{formatVND(r.commission)}</TD>
                    <TD className="text-right">
                      <Link href={`/cong-tac-vien/${encodeURIComponent(r.name)}?range=${range}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline">
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
