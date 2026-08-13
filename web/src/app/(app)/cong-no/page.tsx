import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Wallet, AlertTriangle, Clock, HandCoins } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { toNum, formatVND, formatVNDShort } from "@/lib/money";
import { loadCaseFinancials } from "@/lib/financial-summary-db";
import { fmtDate } from "@/lib/format";
import { DEBT_BUCKETS, DEBT_BUCKET_LABEL, debtAgeDays, debtAgingBucket, isOverThreshold } from "@/lib/debt-aging";
import { nextDueDate } from "@/lib/debt-plan";
import { tplDebtReminder } from "@/lib/message-templates";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactButtons } from "@/components/ui/contact-buttons";
import { ExportMenu } from "@/components/ui/export-menu";
import { revealPhone } from "../khach-hang/actions";
import { getDebtThreshold } from "@/lib/settings";
import { DebtCollectButton } from "./debt-collect-button";
import { DebtFilters } from "./debt-filters";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sổ công nợ" };

const TAKE = PAGE_SIZE;

export default async function DebtLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; tv?: string; page?: string }>;
}) {
  const user = await requireCap("mod:cong-no");
  const canCollect = userCan(user, "payment.add");
  const sp = await searchParams;
  const bucket = DEBT_BUCKETS.includes(sp.bucket as never) ? (sp.bucket as (typeof DEBT_BUCKETS)[number]) : "all";
  // Ngưỡng cảnh báo LƯU Ở DB (dùng chung mọi máy) — không còn nằm ở URL nên không mất khi rời trang.
  const threshold = await getDebtThreshold();
  const tvFilter = (sp.tv ?? "").trim();
  const page = parsePage(sp.page);

  const now = new Date();
  const monthStart = startOfMonth(now);

  const [cases, monthDebtPayments] = await Promise.all([
    prisma.caseRecord.findMany({
      // Do not filter by CaseRecord.debtAmount here. It is a denormalized
      // snapshot and may be stale after a legacy import or an interrupted
      // write; the authoritative debt is rebuilt below from child rows.
      where: {},
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        debtAmount: true,
        createdAt: true,
        customer: { select: { id: true, fullName: true, phoneLast5: true } },
        consultant: { select: { id: true, fullName: true } },
        debtPlan: { select: { dayOfMonth: true, monthlyAmount: true } },
      },
    }),
    // "Đã thu nợ tháng này" = tiền thu trong tháng từ hồ sơ tạo TRƯỚC tháng (đồng bộ định nghĩa với bảng lương)
    prisma.payment.aggregate({
      where: { paidAt: { gte: monthStart }, case: { createdAt: { lt: monthStart } } },
      _sum: { amount: true },
    }),
  ]);

  const financials = await loadCaseFinancials(cases.map((c) => c.id));

  const allRows = cases
    .map((c) => {
      const financial = financials.get(c.id);
      const debt = financial?.debt ?? 0;
      return { ...c, debt, days: debtAgeDays(c.createdAt, now), bucket: debtAgingBucket(debtAgeDays(c.createdAt, now)), over: isOverThreshold(debt, threshold) };
    })
    .filter((r) => r.debt > 0)
    .sort((a, b) => b.debt - a.debt);
  const consultants = [...new Map(allRows.filter((r) => r.consultant).map((r) => [r.consultant!.id, r.consultant!])).values()]
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const filteredAll = allRows
    .filter((r) => (bucket === "all" ? true : r.bucket === bucket))
    .filter((r) => (tvFilter ? r.consultant?.id === tvFilter : true));
  const totalPages = totalPagesOf(filteredAll.length);
  const rows = filteredAll.slice((page - 1) * TAKE, page * TAKE);
  const filtered = rows;
  const totalDebt = allRows.reduce((s, r) => s + r.debt, 0);
  const overCount = allRows.filter((r) => r.over).length;
  const collectedDebtThisMonth = toNum(monthDebtPayments._sum.amount);

  const qs = (b: string, tv = tvFilter) =>
    `/cong-no?bucket=${b}${tv ? `&tv=${tv}` : ""}`;
  const makePageHref = (p: number) => `/cong-no?bucket=${bucket}${tvFilter ? `&tv=${tvFilter}` : ""}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ công nợ"
        description="Theo dõi nợ theo tuổi nợ, thu nợ / tất toán ngay tại đây — khách trả nợ tháng nào tính vào thực thu tháng đó."
        icon={<Wallet className="h-5 w-5" />}
        actions={
          <ExportMenu
            excelHref={`/cong-no/export?format=xlsx&bucket=${bucket}${tvFilter ? `&tv=${tvFilter}` : ""}`}
            wordHref={`/cong-no/export?format=doc&bucket=${bucket}${tvFilter ? `&tv=${tvFilter}` : ""}`}
            csvHref={`/cong-no/export?format=csv&bucket=${bucket}${tvFilter ? `&tv=${tvFilter}` : ""}`}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng công nợ" value={formatVNDShort(totalDebt)} sub={`${allRows.length} hồ sơ còn nợ`} icon={<Wallet className="h-5 w-5" />} tone="red" />
        <StatCard
          label="Đã thu nợ tháng này"
          value={formatVNDShort(collectedDebtThisMonth)}
          sub="Tiền thu trong tháng từ ca các tháng trước"
          icon={<HandCoins className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Vượt ngưỡng cảnh báo"
          value={String(overCount)}
          sub={`Ngưỡng hiện tại: ${formatVND(threshold)}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Nợ lâu nhất" value={`${allRows.reduce((m, r) => Math.max(m, r.days), 0)} ngày`} icon={<Clock className="h-5 w-5" />} tone="purple" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <Link href={qs("all")} className={`rounded-md px-3 py-1 ${bucket === "all" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Tất cả
            </Link>
            {DEBT_BUCKETS.map((b) => (
              <Link key={b} href={qs(b)} className={`rounded-md px-3 py-1 ${bucket === b ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {DEBT_BUCKET_LABEL[b]}
              </Link>
            ))}
          </div>
          <DebtFilters consultants={consultants} tvFilter={tvFilter} bucket={bucket} threshold={threshold} />

        </div>

        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="Không có hồ sơ công nợ" description="Không có hồ sơ nào khớp bộ lọc đã chọn." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Khách hàng</TH>
                  <TH>Hồ sơ</TH>
                  <TH>Tư vấn viên</TH>
                  <TH>Tuổi nợ</TH>
                  <TH className="text-right">Công nợ</TH>
                  <TH>Liên hệ</TH>
                  {canCollect && <TH className="text-right">Thu nợ</TH>}
                </TR>
              </THead>
              <tbody>
                {filtered.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/khach-hang/${r.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {r.customer.fullName}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={`/ho-so/${r.id}`} className="text-slate-500 hover:text-brand-600">
                        {r.code}
                      </Link>
                      <div className="text-xs text-slate-400">{fmtDate(r.createdAt)}</div>
                    </TD>
                    <TD className="text-slate-600">{r.consultant?.fullName ?? <span className="text-slate-300">—</span>}</TD>
                    <TD>
                      <Badge tone={r.bucket === "60+" ? "red" : r.bucket === "30-60" ? "amber" : "slate"}>
                        {r.days} ngày
                      </Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      <span className={r.over ? "font-semibold text-rose-600" : "text-slate-700"}>{formatVND(r.debt)}</span>
                      {r.over && <div className="text-xs text-rose-500">Vượt ngưỡng</div>}
                      {r.debtPlan && (
                        <div className="text-xs font-medium text-emerald-600">
                          Hẹn {formatVNDShort(toNum(r.debtPlan.monthlyAmount))}/th · kỳ {fmtDate(nextDueDate(r.debtPlan.dayOfMonth, now))}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <ContactButtons
                        reveal={revealPhone.bind(null, r.customer.id)}
                        last5={r.customer.phoneLast5}
                        smsBody={tplDebtReminder({ fullName: r.customer.fullName, debtAmount: r.debt, caseCode: r.code })}
                      />
                    </TD>
                    {canCollect && (
                      <TD className="text-right">
                        <DebtCollectButton caseId={r.id} caseCode={r.code} customerName={r.customer.fullName} debt={r.debt} />
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makePageHref} />
      </Card>
    </div>
  );
}
