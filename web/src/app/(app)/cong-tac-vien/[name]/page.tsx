import Link from "next/link";
import { ArrowLeft, Handshake, Users, Wallet, Coins, Receipt } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getCollaboratorDetail, rangeBounds } from "@/lib/performance";
import { formatVND, toNum } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { CASE_STATUS } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
];

export default async function CollaboratorDetail({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireCap("mod:cong-tac-vien");
  const name = decodeURIComponent((await params).name);
  const range = (await searchParams).range ?? "month";
  const { gte, lte, label } = rangeBounds(range);
  const d = await getCollaboratorDetail(name, gte, lte);

  return (
    <div className="space-y-6">
      <Link href={`/cong-tac-vien?range=${range}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Danh sách cộng tác viên
      </Link>

      <PageHeader
        title={name}
        description={`Cộng tác viên · ${label}`}
        icon={<Avatar name={name} className="h-11 w-11 text-base" />}
        actions={
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/cong-tac-vien/${encodeURIComponent(name)}?range=${r.key}`}
                className={`rounded-md px-3 py-1 ${range === r.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Khách giới thiệu" value={d.customers} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Số ca" value={d.cases.length} icon={<Receipt className="h-5 w-5" />} tone="blue" />
        <StatCard label="Doanh số mang về" value={formatVND(d.revenue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Hoa hồng" value={formatVND(d.commission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-brand-500" /> Hồ sơ khách do CTV giới thiệu
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {d.cases.length === 0 ? (
            <EmptyState title="Chưa có ca nào trong kỳ" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Mã ca / Khách</TH>
                  <TH>Trạng thái</TH>
                  <TH className="text-right">Thành tiền</TH>
                  <TH className="text-right">Hoa hồng</TH>
                  <TH>Ngày</TH>
                </TR>
              </THead>
              <tbody>
                {d.cases.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/ho-so/${c.id}`} className="group">
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600">{c.code}</span>
                        <span className="block text-xs text-slate-400">{c.customer?.fullName ?? "—"}</span>
                      </Link>
                    </TD>
                    <TD><Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge></TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(c.totalAmount)}</TD>
                    <TD className="text-right tabular-nums text-violet-600">{formatVND(toNum(c.commissionAmount))}</TD>
                    <TD className="text-slate-500">{fmtDate(c.createdAt)}</TD>
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
