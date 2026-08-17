import Link from "next/link";
import { format, endOfMonth } from "date-fns";
import { Wallet, Coins, HandCoins, Banknote, AlertTriangle } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getPayroll, getPayrollTrend, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { missingAttendanceStaff } from "@/lib/payroll-pure";
import { getStaffPerformance } from "@/lib/performance";
import { getCommissionForMonth } from "@/lib/commission-data";
import type { CommissionBreakdown } from "@/lib/commission";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatVND } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportMenu } from "@/components/ui/export-menu";
import { MultiChart } from "@/components/ui/multi-chart";
import { PayrollEditButton } from "./payroll-edit";
import { PayrollBulkEditor } from "./payroll-bulk-edit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lương & hoa hồng" };

// Diễn giải gợi ý hoa hồng hệ thống tính được thành 1 dòng chữ ngắn — chỉ liệt kê
// các khoản THỰC SỰ áp dụng cho người đó (vd tư vấn viên sẽ không có "DV bác sĩ").
function commissionSuggestionNote(b: CommissionBreakdown): string {
  const parts: string[] = [];
  if (b.doctorService > 0) parts.push(`DV bác sĩ (8%): ${formatVND(b.doctorService)}`);
  if (b.doctorConsult > 0) parts.push(`Tư vấn khách cũ (10%): ${formatVND(b.doctorConsult)}`);
  if (b.nurseService > 0) parts.push(`Phụ trách ca dịch vụ: ${formatVND(b.nurseService)}`);
  if (b.nurseConsult > 0) parts.push(`Tư vấn (4%): ${formatVND(b.nurseConsult)}`);
  if (b.consultant.newCommission > 0) parts.push(`Khách mới (${Math.round(b.consultant.newRate * 100)}%): ${formatVND(b.consultant.newCommission)}`);
  if (b.consultant.returningCommission > 0) parts.push(`Khách cũ (${Math.round(b.consultant.returningRate * 100)}%): ${formatVND(b.consultant.returningCommission)}`);
  return parts.join(" · ");
}

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const user = await requireCap("mod:luong");
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;

  const parsed = sp.m ? new Date(`${sp.m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthValue = format(monthDate, "yyyy-MM");
  const standardDays = Math.max(1, Math.min(31, Number(sp.d) || STANDARD_DAYS_DEFAULT));
  const [p, perf, trend, commissionMap] = await Promise.all([
    getPayroll(monthDate, standardDays),
    getStaffPerformance(monthDate),
    getPayrollTrend(6),
    getCommissionForMonth(monthDate, standardDays),
  ]);
  const revMap = new Map(perf.map((x) => [x.id, x.totalRevenue]));

  // Cảnh báo chấm công có thể chưa chốt — chỉ xét tháng ĐÃ QUA (tháng đang chạy dở dang thì
  // ngày công thấp là bình thường, chưa phải dấu hiệu thiếu sót).
  const isPastMonth = endOfMonth(monthDate) < new Date();
  const missing = isPastMonth ? missingAttendanceStaff(p.rows) : [];

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
            {isAdmin && (
              <PayrollBulkEditor
                rows={p.rows.map((r) => ({
                  id: r.id, name: r.name, commission: r.commission, bonus: r.bonus, adjustment: r.adjustment,
                  hasEntry: r.hasEntry, prevCommission: r.prevCommission, prevBonus: r.prevBonus, prevAdjustment: r.prevAdjustment,
                }))}
                month={monthValue}
              />
            )}
            <ExportMenu
              excelHref={`/luong/export?format=xlsx&m=${monthValue}&d=${standardDays}`}
              wordHref={`/luong/export?format=doc&m=${monthValue}&d=${standardDays}`}
              extra={[
                { label: "Bảng lương kế toán (mẫu chuẩn + phụ lục hoa hồng)", href: `/luong/export-ke-toan?m=${monthValue}&d=${standardDays}` },
              ]}
            />
          </div>
        }
      />

      {missing.length > 0 && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800">
              {missing.length} nhân sự chưa có ngày công nào trong tháng {format(monthDate, "MM/yyyy")} — kiểm tra lại chấm công trước khi chốt lương.
            </p>
            <p className="mt-0.5 text-sm text-amber-700">{missing.map((r) => r.name).join(", ")}</p>
          </div>
          <Link href={`/cham-cong?m=${monthValue}`} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100">
            Xem chấm công
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Thực thu trong tháng"
          value={formatVND(p.collectedAll.total)}
          sub={`Ca tháng này ${formatVND(p.collectedAll.fromNew)} · thu nợ cũ ${formatVND(p.collectedAll.fromDebt)}`}
          icon={<Banknote className="h-5 w-5" />}
          tone="green"
        />
        <StatCard label="Tổng chi lương" value={formatVND(p.totalStaff)} icon={<Wallet className="h-5 w-5" />} tone="brand" />
        <StatCard label="Hoa hồng nhân viên" value={formatVND(p.totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Hoa hồng cộng tác viên" value={formatVND(p.totalCtv)} icon={<HandCoins className="h-5 w-5" />} tone="pink" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bảng lương — {format(monthDate, "MM/yyyy")}</CardTitle>
          <span className="text-xs text-slate-400">
            Thực thu = tiền thật đã về trong tháng từ hồ sơ mình phụ trách (kể cả khách trả nợ ca cũ) — căn cứ nhập hoa hồng.
            {isAdmin && " Bấm “Sửa” để nhập lương cứng / hoa hồng / thưởng / điều chỉnh — cột Hoa hồng có gợi ý hệ thống tự tính theo cơ chế lương, tham khảo chứ không tự ghi đè."}
          </span>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Nhân viên</TH>
                <TH className="text-center">Ngày công</TH>
                <TH className="text-right">DS chốt (TV)</TH>
                <TH className="text-right">Thực thu (TV)</TH>
                <TH className="text-right">Thực thu (BS)</TH>
                <TH className="text-right">Nợ KH còn lại</TH>
                <TH className="text-right">Lương cứng</TH>
                <TH className="text-right">Hoa hồng</TH>
                <TH className="text-right">Thưởng/ĐC</TH>
                <TH className="text-right">Tổng nhận</TH>
                {isAdmin && <TH />}
              </TR>
            </THead>
            <tbody>
              {p.rows.map((r) => {
                const suggested = commissionMap.get(r.id)?.breakdown.totalCommission ?? 0;
                const suggestedNote = commissionMap.get(r.id) ? commissionSuggestionNote(commissionMap.get(r.id)!.breakdown) : "";
                return (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/hieu-suat/${r.id}?m=${monthValue}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">
                      {r.name}
                    </Link>
                    <span className="block text-xs text-slate-400">{ROLE_LABELS[r.role]}</span>
                  </TD>
                  <TD className="text-center tabular-nums">
                    {r.daysWorked === 0 && isPastMonth ? (
                      <span className="text-amber-600">0/{standardDays}</span>
                    ) : (
                      `${r.daysWorked}/${standardDays}`
                    )}
                  </TD>
                  <TD className="text-right tabular-nums text-slate-600">{formatVND(revMap.get(r.id) ?? 0)}</TD>
                  <TD className="text-right tabular-nums">
                    <span className="font-medium text-emerald-700">{formatVND(r.collectedConsult.total)}</span>
                    {r.collectedConsult.fromDebt > 0 && (
                      <span className="block text-[11px] text-slate-400">nợ cũ {formatVND(r.collectedConsult.fromDebt)}</span>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">
                    <span className="font-medium text-emerald-700">{formatVND(r.collectedDoctor.total)}</span>
                    {r.collectedDoctor.fromDebt > 0 && (
                      <span className="block text-[11px] text-slate-400">nợ cũ {formatVND(r.collectedDoctor.fromDebt)}</span>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums text-rose-600">{r.debtOutstanding > 0 ? formatVND(r.debtOutstanding) : "—"}</TD>
                  <TD className="text-right tabular-nums">{formatVND(r.baseActual)}</TD>
                  <TD className="text-right tabular-nums text-amber-600">
                    {formatVND(r.commission)}
                    {suggested > 0 && suggested !== r.commission && (
                      <span className="block text-[11px] font-normal text-slate-400">gợi ý {formatVND(suggested)}</span>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums text-slate-600">{formatVND(r.bonus + r.adjustment)}</TD>
                  <TD className="text-right font-semibold tabular-nums text-slate-900">{formatVND(r.total)}</TD>
                  {isAdmin && (
                    <TD className="text-right">
                      <PayrollEditButton
                        row={{
                          id: r.id, name: r.name, role: r.role, baseFull: r.baseFull,
                          commission: r.commission, bonus: r.bonus, adjustment: r.adjustment,
                          hasEntry: r.hasEntry, prevCommission: r.prevCommission, prevBonus: r.prevBonus, prevAdjustment: r.prevAdjustment,
                        }}
                        month={monthValue}
                        suggested={suggested}
                        suggestedNote={suggestedNote}
                      />
                    </TD>
                  )}
                </TR>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng tổng chi lương (6 tháng gần nhất)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MultiChart data={trend.map((t) => ({ label: t.label, value: t.totalStaff }))} valueLabel="Tổng chi lương" defaultType="bar" trend />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng hoa hồng nhân viên (6 tháng gần nhất)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MultiChart data={trend.map((t) => ({ label: t.label, value: t.totalCommission }))} valueLabel="Hoa hồng" defaultType="bar" trend />
          </CardContent>
        </Card>
      </div>

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
