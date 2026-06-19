import { format } from "date-fns";
import { Wallet, Coins, HandCoins, Banknote } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { PayrollEditButton } from "./payroll-edit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lương & hoa hồng" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const user = await requireCap("mod:luong");
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");
  const standardDays = Math.max(1, Math.min(31, Number(sp.d) || STANDARD_DAYS_DEFAULT));
  const p = await getPayroll(monthDate, standardDays);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lương & hoa hồng"
        description={`Lương cứng theo ngày công (chuẩn ${standardDays} ngày/tháng) + hoa hồng theo cơ chế trung tâm.`}
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              <input type="month" name="m" defaultValue={monthValue} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" />
              <input type="number" name="d" defaultValue={standardDays} min={1} max={31} title="Ngày công chuẩn/tháng" className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-brand-400 focus:outline-none" />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Xem</button>
            </form>
            <ExportMenu
              excelHref={`/luong/export?format=xlsx&m=${monthValue}&d=${standardDays}`}
              wordHref={`/luong/export?format=doc&m=${monthValue}&d=${standardDays}`}
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng chi lương" value={formatVND(p.totalStaff)} icon={<Wallet className="h-5 w-5" />} tone="brand" />
        <StatCard label="Lương cứng (ngày công)" value={formatVND(p.totalBase)} icon={<Banknote className="h-5 w-5" />} tone="blue" />
        <StatCard label="Hoa hồng nhân viên" value={formatVND(p.totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Hoa hồng cộng tác viên" value={formatVND(p.totalCtv)} icon={<HandCoins className="h-5 w-5" />} tone="pink" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bảng lương — {format(monthDate, "MM/yyyy")}</CardTitle>
          {isAdmin && <span className="text-xs text-slate-400">Bấm “Sửa” để nhập lương cứng / thưởng nóng / điều chỉnh.</span>}
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nhân viên</TH>
                <TH>Vai trò</TH>
                <TH className="text-center">Ngày công</TH>
                <TH className="text-right">Lương cứng</TH>
                <TH className="text-right">Hoa hồng</TH>
                <TH className="text-right">Thưởng/ĐC</TH>
                <TH className="text-right">Tổng nhận</TH>
                {isAdmin && <TH />}
              </TR>
            </THead>
            <tbody>
              {p.rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium text-slate-800">{r.name}</TD>
                  <TD className="text-slate-500">{ROLE_LABELS[r.role]}</TD>
                  <TD className="text-center tabular-nums">{r.daysWorked}/{standardDays}</TD>
                  <TD className="text-right tabular-nums">{formatVND(r.baseActual)}</TD>
                  <TD className="text-right tabular-nums text-amber-600">
                    {formatVND(r.commission)}
                    {r.commissionNote !== "—" && <div className="text-[10px] font-normal text-slate-400">{r.commissionNote}</div>}
                  </TD>
                  <TD className="text-right tabular-nums text-slate-600">{formatVND(r.bonus + r.adjustment)}</TD>
                  <TD className="text-right font-semibold tabular-nums text-slate-900">{formatVND(r.total)}</TD>
                  {isAdmin && (
                    <TD className="text-right">
                      <PayrollEditButton
                        row={{ id: r.id, name: r.name, role: r.role, baseFull: r.baseFull, bonus: r.bonus, adjustment: r.adjustment, nurseCases: r.nurseCases }}
                        month={monthValue}
                      />
                    </TD>
                  )}
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-accent-500" /> Hoa hồng cộng tác viên — {format(monthDate, "MM/yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {p.ctv.length === 0 ? (
            <EmptyState title="Chưa có hoa hồng cộng tác viên" description="Đặt % hoa hồng trong hồ sơ có nguồn khách là Cộng tác viên." />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Cộng tác viên</TH>
                  <TH className="text-right">Hoa hồng</TH>
                </TR>
              </THead>
              <tbody>
                {p.ctv.map((c) => (
                  <TR key={c.name}>
                    <TD className="font-medium text-slate-800">{c.name}</TD>
                    <TD className="text-right font-semibold tabular-nums">{formatVND(c.amount)}</TD>
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
