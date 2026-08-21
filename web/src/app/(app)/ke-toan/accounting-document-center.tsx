import Link from "next/link";
import { ExternalLink, FileCheck2, FileText, ReceiptText, WalletCards } from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { paymentRequestStatusLabel, paymentRequestTypeLabel } from "@/lib/payment-request";
import { categoryLabel } from "@/lib/finance";
import type { PayrollRow } from "@/lib/payroll";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

const statusTone: Record<string, "slate" | "amber" | "green" | "red" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  APPROVED: "blue",
  REJECTED: "red",
  PAID: "green",
  CANCELLED: "slate",
};

export async function AccountingDocumentCenter({ monthKey, payrollRows }: { monthKey: string; payrollRows: PayrollRow[] }) {
  const monthDate = new Date(`${monthKey}-01T00:00:00`);
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);
  const [requests, payrollEntries, cash] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { OR: [{ month: monthKey }, { month: null, requestedAt: { gte: from, lte: to } }] },
      orderBy: { requestedAt: "desc" },
      take: 12,
      select: { id: true, requestNo: true, type: true, status: true, payeeName: true, amount: true, requestedAt: true, cashTransaction: { select: { occurredAt: true } } },
    }),
    prisma.payrollEntry.findMany({
      where: { month: monthKey },
      select: { userId: true, paymentRequest: { select: { id: true, requestNo: true } } },
    }),
    prisma.cashTransaction.findMany({
      where: { occurredAt: { gte: from, lte: to } },
      orderBy: { occurredAt: "desc" },
      take: 12,
      select: { id: true, type: true, category: true, amount: true, occurredAt: true, vendor: true, paymentRequest: { select: { id: true, requestNo: true } } },
    }),
  ]);
  const payroll = payrollRows.filter((row) => row.total > 0).sort((a, b) => b.total - a.total).slice(0, 12);
  const payrollRequestByUser = new Map(payrollEntries.map((entry) => [entry.userId, entry.paymentRequest]));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand-600" /> Trung tâm chứng từ kế toán</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Một nơi để mở, in và đối chiếu chứng từ tháng {format(monthDate, "MM/yyyy")}; không phải đi tìm từng menu.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ke-toan/de-nghi-thanh-toan`} className={buttonVariants({ variant: "secondary", size: "sm" })}><FileText className="h-3.5 w-3.5" /> Đề nghị thanh toán</Link>
            <Link href={`/luong?m=${monthKey}`} className={buttonVariants({ variant: "secondary", size: "sm" })}><WalletCards className="h-3.5 w-3.5" /> Bảng lương</Link>
            <Link href={`/thu-chi?month=${monthKey}`} className={buttonVariants({ variant: "secondary", size: "sm" })}><ReceiptText className="h-3.5 w-3.5" /> Sổ thu–chi</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 text-xs">
          <Link href={`/ke-toan/export?format=xlsx&m=${monthKey}`} className="text-brand-700 hover:underline">Xuất Kế toán Excel</Link>
          <span className="text-slate-300">·</span>
          <Link href={`/ke-toan/export?format=doc&m=${monthKey}`} className="text-brand-700 hover:underline">Xuất Kế toán Word</Link>
          <span className="text-slate-300">·</span>
          <Link href={`/luong/export-ke-toan?m=${monthKey}`} className="text-brand-700 hover:underline">Bảng lương cho kế toán</Link>
          <span className="text-slate-300">·</span>
          <Link href={`/thu-chi/export?format=xlsx&scope=month&month=${monthKey}`} className="text-brand-700 hover:underline">Sổ thu–chi Excel</Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">Đề nghị thanh toán</h3><span className="text-xs text-slate-400">{requests.length} gần nhất</span></div>
          {requests.length === 0 ? <EmptyState title="Chưa có phiếu" description="Tạo được cả khoản chi nhỏ từ Sổ thu–chi." /> : <div className="space-y-2">
            {requests.map((request) => <Link key={request.id} href={`/ke-toan/de-nghi-thanh-toan/${request.id}`} className="block rounded-lg bg-white px-3 py-2 shadow-sm transition hover:bg-brand-50">
              <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-brand-700">{request.requestNo}</span><Badge tone={statusTone[request.status] ?? "slate"}>{paymentRequestStatusLabel(request.status)}</Badge></div>
              <p className="mt-1 truncate text-sm text-slate-700">{request.payeeName} · {paymentRequestTypeLabel(request.type)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatVND(Number(request.amount))} · {fmtDate(request.requestedAt)}{request.cashTransaction ? " · đã ghi Thu–chi" : ""}</p>
            </Link>)}
          </div>}
        </section>

        <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">Bảng lương</h3><Link href={`/luong/export-ke-toan?m=${monthKey}`} className="text-xs text-brand-700 hover:underline">Mở file <ExternalLink className="inline h-3 w-3" /></Link></div>
          {payroll.length === 0 ? <EmptyState title="Chưa có bảng lương" description="Dữ liệu sẽ hiện sau khi có bảng lương tháng này." /> : <div className="space-y-2">
            {payroll.map((row) => { const request = payrollRequestByUser.get(row.id); return <div key={row.id} className="rounded-lg bg-white px-3 py-2 shadow-sm"><div className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-slate-700">{row.name}</span><span className="text-sm font-semibold tabular-nums text-slate-900">{formatVND(row.total)}</span></div><p className="mt-1 text-xs text-slate-500">{row.cashTxId ? "Đã ghi chi" : "Chưa ghi chi"}{request ? <> · <Link href={`/ke-toan/de-nghi-thanh-toan/${request.id}`} className="text-brand-700 hover:underline">{request.requestNo}</Link></> : ""}</p></div>; })}
          </div>}
        </section>

        <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">Phiếu Thu–chi</h3><Link href={`/thu-chi?month=${monthKey}`} className="text-xs text-brand-700 hover:underline">Mở sổ <ExternalLink className="inline h-3 w-3" /></Link></div>
          {cash.length === 0 ? <EmptyState title="Chưa có phiếu" description="Các khoản đã ghi sổ sẽ hiện tại đây." /> : <div className="space-y-2">
            {cash.map((row) => <div key={row.id} className="rounded-lg bg-white px-3 py-2 shadow-sm"><div className="flex items-start justify-between gap-2"><span className="text-xs text-slate-500">{fmtDate(row.occurredAt)} · {categoryLabel(row.category)}</span><span className={`text-sm font-semibold tabular-nums ${row.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>{row.type === "INCOME" ? "+" : "−"}{formatVND(Number(row.amount))}</span></div><p className="mt-1 truncate text-xs text-slate-600">{row.vendor || "Không ghi nhà cung cấp"}{row.paymentRequest ? <> · <Link href={`/ke-toan/de-nghi-thanh-toan/${row.paymentRequest.id}`} className="text-brand-700 hover:underline">{row.paymentRequest.requestNo}</Link></> : " · Ghi trực tiếp"}</p></div>)}
          </div>}
        </section>
      </CardContent>
    </Card>
  );
}
