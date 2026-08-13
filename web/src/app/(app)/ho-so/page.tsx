import Link from "next/link";
import { FolderHeart, Search, ShieldCheck } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { formatVND } from "@/lib/money";
import { loadCaseFinancials } from "@/lib/financial-summary-db";
import { fmtDate } from "@/lib/format";
import { CASE_STATUS, CONSULT_RESULT } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ExportMenu } from "@/components/ui/export-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import type { Prisma, CaseStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hồ sơ điều trị" };

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "", label: "Tất cả" },
  { key: "OPEN", label: "Mới mở" },
  { key: "CONSULTED", label: "Đã tư vấn" },
  { key: "SERVICED", label: "Đang làm DV" },
  { key: "COMPLETED", label: "Hoàn tất" },
];

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireCap("mod:ho-so");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();
  const page = parsePage(sp.page);

  // Phân quyền: tư vấn/bác sĩ chỉ thấy hồ sơ của mình (Yêu cầu số 7)
  const scope: Prisma.CaseRecordWhereInput =
    user.role === "CONSULTANT" ? { consultantId: user.id } : user.role === "DOCTOR" ? { doctorId: user.id } : {};

  const filters: Prisma.CaseRecordWhereInput = { ...scope };
  if (status) filters.status = status as CaseStatus;
  if (q) {
    filters.customer = isValidLast5(q)
      ? { phoneLast5: q }
      : { fullName: { contains: q, mode: "insensitive" } };
  }

  const [cases, total] = await Promise.all([
    prisma.caseRecord.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
        consultant: { select: { fullName: true } },
        doctor: { select: { fullName: true } },
        _count: { select: { services: true } },
      },
    }),
    prisma.caseRecord.count({ where: filters }),
  ]);
  const financials = await loadCaseFinancials(cases.map((c) => c.id));
  const totalPages = totalPagesOf(total);
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/ho-so${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ điều trị"
        description={
          user.role === "CONSULTANT"
            ? "Các hồ sơ bạn phụ trách tư vấn."
            : user.role === "DOCTOR"
              ? "Các hồ sơ bạn thực hiện dịch vụ."
              : "Toàn bộ hồ sơ điều trị của phòng khám."
        }
        icon={<FolderHeart className="h-5 w-5" />}
        actions={
          <ExportMenu
            excelHref={`/ho-so/export?format=xlsx${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`}
            wordHref={`/ho-so/export?format=doc${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`}
            csvHref={`/ho-so/export?format=csv${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`}
          />
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((t) => {
              const active = status === t.key;
              const href = `/ho-so?${new URLSearchParams({ ...(q ? { q } : {}), ...(t.key ? { status: t.key } : {}) }).toString()}`;
              return (
                <Link
                  key={t.key}
                  href={href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
          <form action="/ho-so" className="flex items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tên hoặc 5 số cuối…"
                className="h-9 w-56 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button className={buttonVariants({ variant: "secondary", size: "sm" })}>Tìm</button>
          </form>
        </div>

        <CardContent className="pt-0">
          {cases.length === 0 ? (
            <EmptyState icon={<FolderHeart className="h-6 w-6" />} title="Không có hồ sơ phù hợp" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Mã</TH>
                  <TH>Khách hàng</TH>
                  <TH>Trạng thái</TH>
                  <TH>Kết quả TV</TH>
                  <TH className="text-right">Tổng tiền</TH>
                  <TH className="text-right">Còn nợ</TH>
                  <TH>Ngày</TH>
                </TR>
              </THead>
              <tbody>
                {cases.map((c) => {
                  const financial = financials.get(c.id);
                  const totalAmount = financial?.total ?? 0;
                  const debtAmount = financial?.debt ?? 0;
                  return (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/ho-so/${c.id}`} className="font-semibold text-brand-600 hover:text-brand-700">
                        {c.code}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={`/khach-hang/${c.customer.id}`} className="flex items-center gap-2">
                        <Avatar name={c.customer.fullName} className="h-7 w-7 text-[10px]" />
                        <span>
                          <span className="block font-medium text-slate-800">{c.customer.fullName}</span>
                          <span className="block text-xs text-slate-400">
                            <ShieldCheck className="inline h-3 w-3" /> {maskPhone(c.customer.phoneLast5)}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={CONSULT_RESULT[c.consultResult].tone}>{CONSULT_RESULT[c.consultResult].label}</Badge>
                    </TD>
                    <TD className="text-right font-semibold text-slate-800">{formatVND(totalAmount)}</TD>
                    <TD className={cn("text-right font-medium", debtAmount > 0 ? "text-rose-600" : "text-slate-400")}>
                      {formatVND(debtAmount)}
                    </TD>
                    <TD className="text-slate-500">{fmtDate(c.createdAt)}</TD>
                  </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </Card>
    </div>
  );
}
