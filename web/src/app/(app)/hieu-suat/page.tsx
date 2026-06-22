import Link from "next/link";
import { format } from "date-fns";
import { Activity, ChevronRight } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getStaffPerformance } from "@/lib/performance";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hiệu suất nhân sự" };

export default async function StaffPerfPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireCap("mod:hieu-suat");
  const sp = await searchParams;
  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");
  const rows = await getStaffPerformance(monthDate);
  const active = rows.filter((r) => r.consultCases || r.doctorCases || r.daysWorked || r.careCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hiệu suất nhân sự"
        description="Doanh số tư vấn / mổ, tỉ lệ chốt, ngày công và mức độ chăm chỉ của từng người. Bấm vào một người để xem chi tiết từng ca."
        icon={<Activity className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form method="GET" className="flex items-center gap-2">
              <input type="month" name="m" defaultValue={monthValue} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Xem</button>
            </form>
            <ExportMenu excelHref={`/hieu-suat/export?format=xlsx&m=${monthValue}`} wordHref={`/hieu-suat/export?format=doc&m=${monthValue}`} />
          </div>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          {active.length === 0 ? (
            <EmptyState icon={<Activity className="h-6 w-6" />} title="Chưa có dữ liệu trong tháng" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Nhân viên</TH>
                  <TH className="text-center">Ngày công</TH>
                  <TH className="text-center">Ca tư vấn</TH>
                  <TH className="text-center">Chốt</TH>
                  <TH className="text-right">DS tư vấn</TH>
                  <TH className="text-center">Ca mổ</TH>
                  <TH className="text-right">DS mổ</TH>
                  <TH className="text-center">Tin CSKH</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {active.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/hieu-suat/${r.id}?m=${monthValue}`} className="flex items-center gap-2.5 group">
                        <Avatar name={r.name} src={r.avatarUrl} className="h-8 w-8" />
                        <span>
                          <span className="block font-medium text-slate-800 group-hover:text-brand-600 group-hover:underline">{r.name}</span>
                          <span className="block text-xs text-slate-400">{ROLE_LABELS[r.role]}</span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.daysWorked}</TD>
                    <TD className="text-center tabular-nums">{r.consultCases}</TD>
                    <TD className="text-center">
                      {r.consultCases > 0 ? (
                        <Badge tone={r.consultRate >= 60 ? "green" : r.consultRate >= 40 ? "amber" : "red"}>{r.consultRate}%</Badge>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(r.consultRevenue)}</TD>
                    <TD className="text-center tabular-nums">{r.doctorCases}</TD>
                    <TD className="text-right tabular-nums text-slate-700">{formatVND(r.doctorRevenue)}</TD>
                    <TD className="text-center tabular-nums text-slate-700">{r.careCount}</TD>
                    <TD className="text-right">
                      <Link href={`/hieu-suat/${r.id}?m=${monthValue}`} className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline">
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
