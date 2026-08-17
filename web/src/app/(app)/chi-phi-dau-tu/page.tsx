import { startOfYear, endOfYear, format } from "date-fns";
import { Building2, Wallet, CalendarClock, ListChecks } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/status";
import { INVESTMENT_CATEGORY_CODE } from "@/lib/finance";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ExportMenu } from "@/components/ui/export-menu";
import { DeleteButton } from "@/components/ui/delete-button";
import { deleteCashTransaction } from "../thu-chi/actions";
import { NewInvestmentButton, EditInvestmentButton } from "./investment-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chi phí đầu tư" };

export default async function InvestmentPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireCap("mod:chi-phi-dau-tu");
  const canManage = user.role === "ADMIN";
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const where = { category: INVESTMENT_CATEGORY_CODE };
  const [txs, total, allAgg, yearAgg] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { createdBy: { select: { fullName: true } } },
    }),
    prisma.cashTransaction.count({ where }),
    prisma.cashTransaction.aggregate({ where, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { ...where, occurredAt: { gte: yearStart, lte: yearEnd } }, _sum: { amount: true } }),
  ]);
  const totalPages = totalPagesOf(total);
  const makeHref = (p: number) => (p > 1 ? `/chi-phi-dau-tu?page=${p}` : "/chi-phi-dau-tu");
  const totalAll = toNum(allAgg._sum.amount);
  const totalYear = toNum(yearAgg._sum.amount);
  const today = format(now, "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chi phí đầu tư"
        description="Mua sắm tài sản lớn, máy móc, cải tạo mặt bằng… — riêng biệt với chi phí vận hành. Chỉ Quản trị viên và Cổ đông xem được."
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              excelHref="/chi-phi-dau-tu/export?format=xlsx"
              wordHref="/chi-phi-dau-tu/export?format=doc"
              csvHref="/chi-phi-dau-tu/export?format=csv"
            />
            {canManage && <NewInvestmentButton defaultDate={today} />}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng chi phí đầu tư" value={formatVND(totalAll)} sub="Tính từ trước tới nay" icon={<Wallet className="h-5 w-5" />} tone="red" />
        <StatCard label={`Đầu tư năm ${format(now, "yyyy")}`} value={formatVND(totalYear)} icon={<CalendarClock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Số khoản" value={String(total)} icon={<ListChecks className="h-5 w-5" />} tone="brand" />
      </div>

      <Card>
        <CardContent className="pt-5">
          {txs.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Chưa có khoản đầu tư nào"
              description={canManage ? 'Bấm "Thêm khoản đầu tư" để ghi nhận khoản đầu tiên.' : undefined}
            />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Ngày</TH>
                  <TH>Khoản đầu tư / NCC</TH>
                  <TH>Hình thức</TH>
                  <TH className="text-right">Số tiền</TH>
                  <TH>Ghi chú</TH>
                  <TH>Người nhập</TH>
                  {canManage && <TH />}
                </TR>
              </THead>
              <tbody>
                {txs.map((t) => (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap text-slate-500">{fmtDate(t.occurredAt)}</TD>
                    <TD className="font-medium text-slate-800">{t.vendor || "—"}</TD>
                    <TD className="text-slate-600">{PAYMENT_LABEL[t.method]}</TD>
                    <TD className="text-right font-semibold tabular-nums text-rose-600">{formatVND(t.amount)}</TD>
                    <TD className="text-slate-500">{t.note ?? ""}</TD>
                    <TD className="text-slate-500">{t.createdBy?.fullName ?? "—"}</TD>
                    {canManage && (
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditInvestmentButton
                            tx={{
                              id: t.id,
                              amount: toNum(t.amount),
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
                            confirmText={`Xóa khoản đầu tư "${t.vendor || formatVND(t.amount)}"?`}
                            className="text-slate-300 hover:text-rose-500"
                          />
                        </div>
                      </TD>
                    )}
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </Card>
    </div>
  );
}
