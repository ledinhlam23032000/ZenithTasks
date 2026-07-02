import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Activity, CalendarCheck, MessageCircleHeart, Target, Stethoscope, Wallet } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getStaffDetail } from "@/lib/performance";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND, toNum } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { CASE_STATUS, CONSULT_RESULT } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type CaseRow = {
  id: string;
  code: string;
  status: keyof typeof CASE_STATUS;
  consultResult: keyof typeof CONSULT_RESULT;
  totalAmount: unknown;
  createdAt: Date;
  customer: { id: string; fullName: string; code: string | null } | null;
};

function CaseList({ cases }: { cases: CaseRow[] }) {
  if (cases.length === 0) return <EmptyState title="Chưa có ca nào trong tháng" />;
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH>Mã / Khách</TH>
          <TH>Trạng thái</TH>
          <TH>Kết quả</TH>
          <TH className="text-right">Thành tiền</TH>
          <TH>Ngày</TH>
        </TR>
      </THead>
      <tbody>
        {cases.map((c) => (
          <TR key={c.id}>
            <TD>
              <Link href={`/ho-so/${c.id}`} className="group">
                <span className="font-semibold text-slate-800 group-hover:text-brand-600">{c.code}</span>
                <span className="block text-xs text-slate-400">{c.customer?.fullName ?? "—"}</span>
              </Link>
            </TD>
            <TD><Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge></TD>
            <TD><Badge tone={CONSULT_RESULT[c.consultResult].tone}>{CONSULT_RESULT[c.consultResult].label}</Badge></TD>
            <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(c.totalAmount)}</TD>
            <TD className="text-slate-500">{fmtDate(c.createdAt)}</TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}

export default async function StaffPerfDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  await requireCap("mod:hieu-suat");
  const { id } = await params;
  const sp = await searchParams;
  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");

  const { user, consultCases, doctorCases, daysWorked, careCount, collections, collectedTotal, collectedFromDebt } =
    await getStaffDetail(id, monthDate);
  if (!user) notFound();

  const consultRevenue = consultCases.reduce((s, c) => s + toNum(c.totalAmount), 0);
  const doctorRevenue = doctorCases.reduce((s, c) => s + toNum(c.totalAmount), 0);
  const agreed = consultCases.filter((c) => c.consultResult === "AGREED").length;
  const rate = consultCases.length > 0 ? Math.round((agreed / consultCases.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href={`/hieu-suat?m=${monthValue}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Hiệu suất nhân sự
      </Link>

      <PageHeader
        title={user.fullName}
        description={`${ROLE_LABELS[user.role]} · ${user.code ?? "—"} · tháng ${format(monthDate, "MM/yyyy")}`}
        icon={<Avatar name={user.fullName} src={user.avatarUrl} className="h-11 w-11 text-base" />}
        actions={
          <form method="GET" className="flex items-center gap-2">
            <input type="month" name="m" defaultValue={monthValue} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" />
            <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Xem</button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Thực thu trong tháng"
          value={formatVND(collectedTotal)}
          sub={collectedFromDebt > 0 ? `Trong đó thu nợ ca cũ ${formatVND(collectedFromDebt)}` : "Tiền thật đã về từ hồ sơ mình phụ trách"}
          icon={<Wallet className="h-5 w-5" />}
          tone="green"
        />
        <StatCard label="Doanh số tư vấn (chốt)" value={formatVND(consultRevenue)} sub="Giá trị hồ sơ, gồm cả nợ chưa thu" icon={<Wallet className="h-5 w-5" />} tone="blue" />
        <StatCard label="Tỉ lệ chốt tư vấn" value={`${rate}%`} sub={`${agreed}/${consultCases.length} ca`} icon={<Target className="h-5 w-5" />} tone="amber" />
        <StatCard label="Ngày công · Tin CSKH" value={`${daysWorked} · ${careCount}`} icon={<CalendarCheck className="h-5 w-5" />} tone="brand" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" /> Các khoản tiền đã thu trong tháng ({collections.length}) — căn cứ tính hoa hồng
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {collections.length === 0 ? (
            <EmptyState title="Chưa thu khoản nào trong tháng" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Ngày thu</TH>
                  <TH>Hồ sơ / Khách</TH>
                  <TH>Loại</TH>
                  <TH>Vai trò</TH>
                  <TH className="text-right">Số tiền</TH>
                </TR>
              </THead>
              <tbody>
                {collections.map((c) => (
                  <TR key={c.id}>
                    <TD className="text-slate-500">{fmtDate(c.paidAt)}</TD>
                    <TD>
                      <Link href={`/ho-so/${c.caseId}`} className="group">
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600">{c.caseCode}</span>
                        <span className="block text-xs text-slate-400">{c.customer?.fullName ?? "—"}</span>
                      </Link>
                    </TD>
                    <TD>
                      {c.isDebtCollection ? <Badge tone="amber">Thu nợ ca cũ</Badge> : <Badge tone="green">Ca tháng này</Badge>}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {[c.asConsultant && "Tư vấn", c.asDoctor && "Bác sĩ"].filter(Boolean).join(" · ")}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-emerald-700">{formatVND(c.amount)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" /> Ca tư vấn ({consultCases.length}) · DS {formatVND(consultRevenue)}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <CaseList cases={consultCases as CaseRow[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-violet-500" /> Ca mổ / thực hiện ({doctorCases.length}) · DS {formatVND(doctorRevenue)}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <CaseList cases={doctorCases as CaseRow[]} />
        </CardContent>
      </Card>
    </div>
  );
}
