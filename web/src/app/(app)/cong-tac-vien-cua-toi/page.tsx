import Link from "next/link";
import { Handshake, Users, Coins, Wallet } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import { collaboratorCustomerWhere, requireCollaborator } from "@/lib/collaborator-access";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khách hàng & hoa hồng" };

export default async function CollaboratorWorkspace({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requireCap("mod:cong-tac-vien-cua-toi");
  const collaborator = await requireCollaborator(user.id);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = parsePage(sp.page);
  const filters: Prisma.CustomerWhereInput[] = [collaboratorCustomerWhere(collaborator.id)];
  if (q) filters.push({ fullName: { contains: q, mode: "insensitive" } });
  const where: Prisma.CustomerWhereInput = { AND: filters };

  const [customers, total, commission, payouts] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { collaboratorAssignedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        code: true,
        fullName: true,
        phoneLast5: true,
        gender: true,
        collaboratorAssignedAt: true,
        cases: { where: { collaboratorId: collaborator.id }, select: { status: true, commissionAmount: true } },
      },
    }),
    prisma.customer.count({ where }),
    prisma.caseRecord.aggregate({ where: { collaboratorId: collaborator.id }, _sum: { commissionAmount: true } }),
    prisma.commissionPayout.findMany({ where: { collaboratorId: collaborator.id }, orderBy: { month: "desc" }, take: 12, select: { month: true, amount: true, paidAt: true, name: true } }),
  ]);

  const totalCommission = Number(commission._sum.commissionAmount ?? 0);
  const totalPaid = payouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
  const totalPages = totalPagesOf(total);
  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/cong-tac-vien-cua-toi${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Xin chào, ${collaborator.name}`} description="Danh sách khách hàng đang thuộc phạm vi cộng tác viên và hoa hồng của bạn." icon={<Handshake className="h-5 w-5" />} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Khách đang hiển thị" value={total} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Tổng hoa hồng" value={formatVND(totalCommission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Đã chi theo kỳ" value={formatVND(totalPaid)} icon={<Wallet className="h-5 w-5" />} tone="green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Khách hàng của tôi</CardTitle>
          <span className="text-xs text-slate-500">Sau 6 tháng, khách tự động chuyển khỏi danh sách CTV và thuộc phạm vi trung tâm.</span>
        </CardHeader>
        <CardContent>
          <form action="/cong-tac-vien-cua-toi" className="mb-4 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Tìm theo tên khách hàng…" className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
            <button className="rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">Tìm</button>
          </form>
          {customers.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Chưa có khách trong phạm vi hiện tại" description="Khách quá 6 tháng sẽ không còn hiện trong danh sách này; dữ liệu hoa hồng cũ vẫn được giữ." />
          ) : (
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Khách hàng</TH><TH>Mã khách</TH><TH>Số điện thoại</TH><TH>Ngày phụ trách</TH><TH>Số hồ sơ</TH><TH /></TR></THead>
              <tbody>
                {customers.map((customer) => (
                  <TR key={customer.id}>
                    <TD><Link href={`/khach-hang/${customer.id}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">{customer.fullName}</Link></TD>
                    <TD><Badge tone="slate">{customer.code}</Badge></TD>
                    <TD className="font-mono text-xs text-slate-600">•••{customer.phoneLast5}</TD>
                    <TD className="text-sm text-slate-600">{customer.collaboratorAssignedAt ? fmtDate(customer.collaboratorAssignedAt) : "—"}</TD>
                    <TD className="text-center tabular-nums">{customer.cases.length}</TD>
                    <TD className="text-right"><Link href={`/khach-hang/${customer.id}`} className="text-xs font-medium text-brand-600 hover:underline">Xem đầy đủ</Link></TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lịch sử hoa hồng đã chi</CardTitle><span className="text-xs text-slate-500">Thông tin hiển thị được đồng bộ theo hồ sơ CTV; số tiền không bị tính lại.</span></CardHeader>
        <CardContent>
          {payouts.length === 0 ? <p className="py-6 text-sm text-slate-500">Chưa có kỳ hoa hồng đã chi.</p> : (
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Tháng</TH><TH className="text-right">Số tiền</TH><TH>Ngày chi</TH><TH>Trạng thái</TH></TR></THead>
              <tbody>{payouts.map((payout) => <TR key={payout.month}><TD>{payout.month}</TD><TD className="text-right font-semibold tabular-nums">{formatVND(Number(payout.amount))}</TD><TD>{fmtDate(payout.paidAt)}</TD><TD><Badge tone="green">Đã ghi nhận</Badge></TD></TR>)}</tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
