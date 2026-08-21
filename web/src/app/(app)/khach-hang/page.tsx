import Link from "next/link";
import { Users, FolderHeart, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { fmtDate } from "@/lib/format";
import { GENDER_LABEL, SOURCE_LABEL, DONE_CASE_STATUSES } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { NewCustomerButton } from "../tiep-nhan/new-customer";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";
import { collaboratorCustomerWhere, collaboratorCaseWhere, requireCollaborator } from "@/lib/collaborator-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hồ sơ khách hàng" };

const DONE_STATUSES = DONE_CASE_STATUSES;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; loc?: string; page?: string }> }) {
  const user = await requireCap("mod:khach-hang");
  const collaborator = user.role === "COLLABORATOR" ? await requireCollaborator(user.id) : null;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const loc = sp.loc === "done" || sp.loc === "undone" ? sp.loc : "all";
  const page = parsePage(sp.page);

  const caseScope: Prisma.CaseRecordWhereInput =
    user.role === "CONSULTANT" ? { consultantId: user.id } : user.role === "DOCTOR" ? { doctorId: user.id } : collaborator ? collaboratorCaseWhere(collaborator.id) : {};
  const filters: Prisma.CustomerWhereInput[] = [];
  if (collaborator) filters.push(collaboratorCustomerWhere(collaborator.id));
  if (user.role === "CONSULTANT" || user.role === "DOCTOR") filters.push({ cases: { some: caseScope } });
  if (q) filters.push(isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } });
  // Phải gộp caseScope vào đây (không chỉ lọc theo status) — nếu không, Tư vấn viên/Bác
  // sĩ lọc tab sẽ tính theo TOÀN BỘ ca của khách (kể cả ca của người khác) trong khi cột
  // "Trạng thái" mỗi dòng lại chỉ tính theo ca CỦA MÌNH (xem caseScope ở `select` bên dưới)
  // — mâu thuẫn ngay trên cùng 1 dòng.
  if (loc === "done") filters.push({ cases: { some: { ...caseScope, status: { in: DONE_STATUSES } } } });
  if (loc === "undone") filters.push({ cases: { none: { ...caseScope, status: { in: DONE_STATUSES } } } });
  const where: Prisma.CustomerWhereInput = filters.length ? { AND: filters } : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        code: true,
        fullName: true,
        gender: true,
        phoneLast5: true,
        source: true,
        createdAt: true,
        cases: { where: caseScope, select: { status: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const canCreate = ["ADMIN", "RECEPTION"].includes(user.role);
  const totalPages = totalPagesOf(total);

  const tabs = [
    { key: "all", label: "Tất cả" },
    { key: "undone", label: "Chưa làm dịch vụ" },
    { key: "done", label: "Đã làm dịch vụ" },
  ];
  const qs = (k: string) => `/khach-hang?loc=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (loc !== "all") params.set("loc", loc);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/khach-hang${s ? `?${s}` : ""}`;
  };
  const customerRows = customers.map((customer) => {
    const statuses = customer.cases.map((item) => item.status);
    const done = statuses.some((status) => DONE_STATUSES.includes(status));
    const allCancelled = statuses.length > 0 && statuses.every((status) => status === "CANCELLED");
    const displayStatus: "done" | "cancelled" | "undone" = done ? "done" : allCancelled ? "cancelled" : "undone";
    return { ...customer, displayStatus };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ khách hàng"
        description={`${total} hồ sơ khách. Mỗi khách gồm thông tin + toàn bộ hồ sơ điều trị.`}
        icon={<FolderHeart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {userCan(user, "mod:ho-so") && (
              <Link href="/ho-so" className={buttonVariants({ variant: "secondary" })}>
                <Stethoscope className="h-4 w-4" /> Tất cả hồ sơ điều trị
              </Link>
            )}
            {canCreate && <NewCustomerButton />}
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <form action="/khach-hang" className="flex flex-1 items-center gap-2">
            {loc !== "all" && <input type="hidden" name="loc" value={loc} />}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên hoặc 5 số cuối điện thoại…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button className={buttonVariants({ variant: "secondary" })}>Tìm</button>
            {q && (
              <Link href={qs(loc)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Xóa lọc
              </Link>
            )}
          </form>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {tabs.map((t) => {
              const active = loc === t.key;
              return (
                <Link
                  key={t.key}
                  href={qs(t.key)}
                  className={`rounded-md px-3 py-1 ${active ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        <CardContent className="pt-0">
          {customers.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Không có khách hàng phù hợp" description="Thử từ khóa khác hoặc lập hồ sơ mới." />
          ) : (
            <>
            <div className="divide-y divide-slate-100 sm:hidden">
              {customerRows.map((customer) => (
                <Link key={customer.id} href={`/khach-hang/${customer.id}`} className="block py-4 active:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <Avatar name={customer.fullName} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{customer.fullName}</p>
                          <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                            <ShieldCheck className="h-3 w-3 text-brand-400" /> {maskPhone(customer.phoneLast5)}
                          </p>
                        </div>
                        <CustomerStatus status={customer.displayStatus} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>Nguồn: <b className="font-medium text-slate-700">{SOURCE_LABEL[customer.source]}</b></span>
                        <span>Lượt khám: <b className="font-medium text-slate-700">{customer.cases.length}</b></span>
                        <span>{customer.gender ? GENDER_LABEL[customer.gender] : "Chưa có giới tính"}</span>
                        <span>Tạo {fmtDate(customer.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden sm:block">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Khách hàng</TH>
                  <TH>Trạng thái</TH>
                  <TH>Điện thoại</TH>
                  <TH>Giới tính</TH>
                  <TH>Nguồn</TH>
                  <TH className="text-center">Lượt khám</TH>
                  <TH>Ngày tạo</TH>
                </TR>
              </THead>
              <tbody>
                {customerRows.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/khach-hang/${c.id}`} className="flex items-center gap-2.5">
                          <Avatar name={c.fullName} className="h-8 w-8" />
                          <span className="font-medium text-slate-800 hover:text-brand-600">{c.fullName}</span>
                        </Link>
                      </TD>
                      <TD>
                        <CustomerStatus status={c.displayStatus} />
                      </TD>
                      <TD className="font-mono text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-brand-400" /> {maskPhone(c.phoneLast5)}
                        </span>
                      </TD>
                      <TD className="text-slate-600">{c.gender ? GENDER_LABEL[c.gender] : "—"}</TD>
                      <TD className="text-slate-600">{SOURCE_LABEL[c.source]}</TD>
                      <TD className="text-center font-medium text-slate-700">{c.cases.length}</TD>
                      <TD className="text-slate-500">{fmtDate(c.createdAt)}</TD>
                    </TR>
                ))}
              </tbody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </Card>
    </div>
  );
}

function CustomerStatus({ status }: { status: "done" | "cancelled" | "undone" }) {
  if (status === "done") return <Badge tone="green" dot>Đã làm</Badge>;
  if (status === "cancelled") return <Badge tone="slate" dot>Đã hủy</Badge>;
  return <Badge tone="amber" dot>Chưa làm</Badge>;
}
