import Link from "next/link";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { vi } from "date-fns/locale";
import { Coins, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Scale } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/status";
import { CASH_TYPE, categoryLabel } from "@/lib/finance";
import { userCan } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ExportMenu } from "@/components/ui/export-menu";
import { DeleteButton } from "@/components/ui/delete-button";
import { NewCashButton, EditCashButton } from "./cash-forms";
import { deleteCashTransaction } from "./actions";
import type { Prisma, CashType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thu chi" };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ month?: string; type?: string }> }) {
  const user = await requireCap("mod:thu-chi");
  const canManage = userCan(user, "cash.write");
  const sp = await searchParams;

  const monthRef = sp.month ? new Date(`${sp.month}-01T00:00:00`) : new Date();
  const month = Number.isNaN(monthRef.getTime()) ? new Date() : monthRef;
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const monthKey = format(month, "yyyy-MM");
  const typeFilter = sp.type === "INCOME" || sp.type === "EXPENSE" ? (sp.type as CashType) : null;

  const where: Prisma.CashTransactionWhereInput = {
    occurredAt: { gte: from, lte: to },
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [txs, monthAll] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      include: { createdBy: { select: { fullName: true } } },
    }),
    prisma.cashTransaction.findMany({
      where: { occurredAt: { gte: from, lte: to } },
      select: { type: true, amount: true, category: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  const byCat = new Map<string, number>();
  for (const t of monthAll) {
    const a = toNum(t.amount);
    if (t.type === "INCOME") income += a;
    else {
      expense += a;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + a);
    }
  }
  const balance = income - expense; // số dư dòng tiền của sổ (KHÔNG gồm doanh thu dịch vụ)
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const prevMonth = format(addMonths(month, -1), "yyyy-MM");
  const nextMonth = format(addMonths(month, 1), "yyyy-MM");
  const today = format(new Date(), "yyyy-MM-dd");

  const tabs = [
    { key: "", label: "Tất cả" },
    { key: "INCOME", label: "Chỉ Thu" },
    { key: "EXPENSE", label: "Chỉ Chi" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ thu chi"
        description="Ghi nhận mọi khoản tiền ra – vào của trung tâm (mua vật tư, máy móc, tiếp khách, thu khác…)."
        icon={<Coins className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              excelHref={`/thu-chi/export?format=xlsx&month=${monthKey}${typeFilter ? `&type=${typeFilter}` : ""}`}
              wordHref={`/thu-chi/export?format=doc&month=${monthKey}${typeFilter ? `&type=${typeFilter}` : ""}`}
            />
            {canManage && <NewCashButton defaultDate={today} />}
          </div>
        }
      />

      {/* Dòng tiền của sổ thu chi (doanh thu dịch vụ & lãi/lỗ xem ở Báo cáo) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Tổng thu ${format(month, "MM/yyyy")}`} value={formatVND(income)} sub="Tiền vào sổ (gồm ứng từ doanh thu)" icon={<ArrowUpRight className="h-5 w-5" />} tone="green" />
        <StatCard label="Tổng chi" value={formatVND(expense)} sub="Chi phí vận hành" icon={<ArrowDownRight className="h-5 w-5" />} tone="pink" />
        <StatCard label="Số dư sổ" value={formatVND(balance)} sub="Tổng thu − tổng chi" icon={<Scale className="h-5 w-5" />} tone={balance >= 0 ? "brand" : "red"} />
      </div>

      {topCats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chi nhiều nhất theo hạng mục · {format(month, "MM/yyyy")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topCats.map(([code, amount]) => (
                <div key={code} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-600">{categoryLabel(code)}</span>
                  <span className="text-sm font-semibold text-rose-600">{formatVND(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Link href={`/thu-chi?month=${prevMonth}${typeFilter ? `&type=${typeFilter}` : ""}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng trước">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="px-2 text-sm font-semibold capitalize text-slate-800">{format(month, "'Tháng' MM/yyyy", { locale: vi })}</span>
            <Link href={`/thu-chi?month=${nextMonth}${typeFilter ? `&type=${typeFilter}` : ""}`} className={buttonVariants({ variant: "secondary", size: "icon" })} aria-label="Tháng sau">
              <ChevronRight className="h-4 w-4" />
            </Link>
            <form action="/thu-chi" className="ml-1">
              <input type="month" name="month" defaultValue={monthKey} className="h-9 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-brand-500" />
              {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            </form>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {tabs.map((t) => {
              const active = (typeFilter ?? "") === t.key;
              return (
                <Link
                  key={t.key}
                  href={`/thu-chi?month=${monthKey}${t.key ? `&type=${t.key}` : ""}`}
                  className={`rounded-md px-3 py-1 ${active ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        <CardContent className="pt-0">
          {txs.length === 0 ? (
            <EmptyState icon={<Coins className="h-6 w-6" />} title="Chưa có giao dịch trong tháng này" description="Bấm “Thêm thu / chi” để ghi nhận khoản tiền đầu tiên." />
          ) : (
            <>
            <div className="hidden sm:block">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Ngày</TH>
                  <TH>Loại</TH>
                  <TH>Hạng mục</TH>
                  <TH>Nguồn / Ghi chú</TH>
                  <TH>Hình thức</TH>
                  <TH className="text-right">Số tiền</TH>
                  <TH />
                </TR>
              </THead>
              <tbody>
                {txs.map((t) => {
                  const a = toNum(t.amount);
                  const isIncome = t.type === "INCOME";
                  return (
                    <TR key={t.id}>
                      <TD className="whitespace-nowrap text-slate-500">{fmtDate(t.occurredAt)}</TD>
                      <TD>
                        <Badge tone={CASH_TYPE[t.type].tone}>{CASH_TYPE[t.type].label}</Badge>
                      </TD>
                      <TD className="font-medium text-slate-700">{categoryLabel(t.category)}</TD>
                      <TD className="text-slate-500">
                        {t.vendor && <span className="text-slate-700">{t.vendor}</span>}
                        {t.vendor && t.note ? " · " : ""}
                        {t.note}
                        {!t.vendor && !t.note ? "—" : ""}
                      </TD>
                      <TD className="text-slate-500">{PAYMENT_LABEL[t.method]}</TD>
                      <TD className={`text-right font-semibold tabular-nums ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                        {isIncome ? "+" : "−"}{formatVND(a)}
                      </TD>
                      <TD className="text-right">
                        {canManage && (
                        <div className="flex items-center justify-end gap-0.5">
                          <EditCashButton
                            tx={{
                              id: t.id,
                              type: t.type,
                              category: t.category,
                              amount: a,
                              occurredAt: format(t.occurredAt, "yyyy-MM-dd"),
                              method: t.method,
                              vendor: t.vendor ?? "",
                              note: t.note ?? "",
                            }}
                          />
                          <DeleteButton
                            action={deleteCashTransaction}
                            id={t.id}
                            label=""
                            confirmText={`Xóa giao dịch ${categoryLabel(t.category)} ${formatVND(a)}?`}
                            className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                          />
                        </div>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
            </div>
            <div className="space-y-2 sm:hidden">
              {txs.map((t) => {
                const a = toNum(t.amount);
                const isIncome = t.type === "INCOME";
                return (
                  <div key={t.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={CASH_TYPE[t.type].tone}>{CASH_TYPE[t.type].label}</Badge>
                        <span className="font-medium text-slate-700">{categoryLabel(t.category)}</span>
                      </div>
                      <span className={`font-semibold tabular-nums ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                        {isIncome ? "+" : "−"}{formatVND(a)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {fmtDate(t.occurredAt)} · {PAYMENT_LABEL[t.method]}
                      {t.vendor || t.note ? ` · ${[t.vendor, t.note].filter(Boolean).join(" · ")}` : ""}
                    </p>
                    {canManage && (
                    <div className="mt-2 flex items-center justify-end gap-0.5">
                      <EditCashButton
                        tx={{
                          id: t.id,
                          type: t.type,
                          category: t.category,
                          amount: a,
                          occurredAt: format(t.occurredAt, "yyyy-MM-dd"),
                          method: t.method,
                          vendor: t.vendor ?? "",
                          note: t.note ?? "",
                        }}
                      />
                      <DeleteButton
                        action={deleteCashTransaction}
                        id={t.id}
                        label=""
                        confirmText={`Xóa giao dịch ${categoryLabel(t.category)} ${formatVND(a)}?`}
                        className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                      />
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
