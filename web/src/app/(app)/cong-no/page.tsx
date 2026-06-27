import Link from "next/link";
import { Wallet, AlertTriangle, Clock } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum, formatVND, formatVNDShort } from "@/lib/money";
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
import { buttonVariants } from "@/components/ui/button";
import { ContactButtons } from "@/components/ui/contact-buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sổ công nợ" };

const DEFAULT_THRESHOLD = 5_000_000;
const TAKE = 200;

export default async function DebtLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; threshold?: string }>;
}) {
  await requireCap("mod:cong-no");
  const sp = await searchParams;
  const bucket = DEBT_BUCKETS.includes(sp.bucket as never) ? (sp.bucket as (typeof DEBT_BUCKETS)[number]) : "all";
  const threshold = Number(sp.threshold ?? DEFAULT_THRESHOLD) || 0;

  const cases = await prisma.caseRecord.findMany({
    where: { debtAmount: { gt: 0 } },
    orderBy: { debtAmount: "desc" },
    take: TAKE,
    select: {
      id: true,
      code: true,
      debtAmount: true,
      createdAt: true,
      customer: { select: { id: true, fullName: true, phoneLast5: true } },
      debtPlan: { select: { dayOfMonth: true, monthlyAmount: true } },
    },
  });

  const now = new Date();
  const rows = cases.map((c) => {
    const days = debtAgeDays(c.createdAt, now);
    const debt = toNum(c.debtAmount);
    return { ...c, days, debt, bucket: debtAgingBucket(days), over: isOverThreshold(debt, threshold) };
  });

  const filtered = bucket === "all" ? rows : rows.filter((r) => r.bucket === bucket);
  const totalDebt = rows.reduce((s, r) => s + r.debt, 0);
  const overCount = rows.filter((r) => r.over).length;
  const oldestDays = rows.reduce((m, r) => Math.max(m, r.days), 0);

  const qs = (b: string) => `/cong-no?bucket=${b}${threshold !== DEFAULT_THRESHOLD ? `&threshold=${threshold}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ công nợ"
        description="Theo dõi nợ theo tuổi nợ, cảnh báo hồ sơ vượt ngưỡng — chủ động gọi/nhắc khách trả nợ."
        icon={<Wallet className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng công nợ" value={formatVNDShort(totalDebt)} sub={`${rows.length} hồ sơ còn nợ`} icon={<Wallet className="h-5 w-5" />} tone="red" />
        <StatCard
          label="Vượt ngưỡng cảnh báo"
          value={String(overCount)}
          sub={`Ngưỡng hiện tại: ${formatVND(threshold)}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Nợ lâu nhất" value={`${oldestDays} ngày`} icon={<Clock className="h-5 w-5" />} tone="purple" />
        <StatCard label="Đang xem" value={String(filtered.length)} sub={bucket === "all" ? "Tất cả tuổi nợ" : DEBT_BUCKET_LABEL[bucket]} tone="slate" />
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
          <form action="/cong-no" className="flex items-center gap-2 text-xs text-slate-500">
            {bucket !== "all" && <input type="hidden" name="bucket" value={bucket} />}
            Ngưỡng cảnh báo
            <input
              name="threshold"
              type="number"
              min={0}
              step="any"
              defaultValue={threshold}
              className="w-28 rounded-md border border-slate-200 px-2 py-1 text-right text-xs focus:border-brand-400 focus:outline-none"
            />
            <button className={buttonVariants({ variant: "secondary", size: "sm" })}>Áp dụng</button>
          </form>
        </div>

        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="Không có hồ sơ công nợ" description="Không có hồ sơ nào khớp tuổi nợ đã chọn." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Khách hàng</TH>
                  <TH>Hồ sơ</TH>
                  <TH>Tuổi nợ</TH>
                  <TH className="text-right">Công nợ</TH>
                  <TH>Liên hệ</TH>
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
                        customerId={r.customer.id}
                        last5={r.customer.phoneLast5}
                        smsBody={tplDebtReminder({ fullName: r.customer.fullName, debtAmount: r.debt, caseCode: r.code })}
                      />
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
