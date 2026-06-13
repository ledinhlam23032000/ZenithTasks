import { format } from "date-fns";
import { Wallet, Coins, HandCoins, Banknote, FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPayroll } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/ui/print-button";
import { setStaffSalary } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lương & hoa hồng" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");

  const p = await getPayroll(monthDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lương & hoa hồng"
        description="Tính lương theo tháng: lương cơ bản + hoa hồng theo doanh thu phụ trách, và hoa hồng cộng tác viên."
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              <input
                type="month"
                name="m"
                defaultValue={monthValue}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Xem
              </button>
            </form>
            <a
              href={`/luong/export?m=${monthValue}`}
              className="print-hide inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Xuất Excel
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng lương nhân sự" value={formatVND(p.totalStaff)} icon={<Wallet className="h-5 w-5" />} tone="brand" />
        <StatCard label="Trong đó lương cơ bản" value={formatVND(p.totalBase)} icon={<Banknote className="h-5 w-5" />} tone="blue" />
        <StatCard label="Hoa hồng nhân viên" value={formatVND(p.totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Hoa hồng cộng tác viên" value={formatVND(p.totalCtv)} icon={<HandCoins className="h-5 w-5" />} tone="pink" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bảng lương nhân sự — {format(monthDate, "MM/yyyy")}</CardTitle>
          {isAdmin && <span className="text-xs text-slate-400">Sửa lương cơ bản &amp; % hoa hồng rồi bấm “Lưu”.</span>}
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nhân viên</TH>
                <TH>Vai trò</TH>
                <TH className="text-right">Lương cơ bản</TH>
                <TH className="text-center">% HH</TH>
                <TH className="text-right">Doanh thu phụ trách</TH>
                <TH className="text-right">Hoa hồng</TH>
                <TH className="text-right">Tổng nhận</TH>
                {isAdmin && <TH />}
              </TR>
            </THead>
            <tbody>
              {p.rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium text-slate-800">{r.name}</TD>
                  <TD className="text-slate-500">{ROLE_LABELS[r.role]}</TD>
                  {isAdmin ? (
                    <TD colSpan={2}>
                      <form action={setStaffSalary} className="flex items-center justify-end gap-1.5">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="baseSalary"
                          type="number"
                          min={0}
                          step={100000}
                          defaultValue={r.base}
                          className="w-28 rounded-md border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                        />
                        <input
                          name="commissionRate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          defaultValue={r.rate}
                          className="w-14 rounded-md border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none"
                        />
                        <button className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-brand-100 hover:text-brand-700">
                          Lưu
                        </button>
                      </form>
                    </TD>
                  ) : (
                    <>
                      <TD className="text-right tabular-nums">{formatVND(r.base)}</TD>
                      <TD className="text-center tabular-nums">{r.rate}%</TD>
                    </>
                  )}
                  <TD className="text-right tabular-nums text-slate-600">{r.revenue > 0 ? formatVND(r.revenue) : "—"}</TD>
                  <TD className="text-right tabular-nums text-amber-600">{formatVND(r.commission)}</TD>
                  <TD className="text-right font-semibold tabular-nums text-slate-900">{formatVND(r.total)}</TD>
                  {isAdmin && <TD />}
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
            <EmptyState title="Chưa có hoa hồng cộng tác viên" description="Đặt % hoa hồng trong từng hồ sơ điều trị có nguồn khách là Cộng tác viên." />
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
                    <TD className="text-right font-semibold tabular-nums text-slate-900">{formatVND(c.amount)}</TD>
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
