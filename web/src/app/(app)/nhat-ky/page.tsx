import { startOfDay, endOfDay } from "date-fns";
import { ScrollText } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getConsultants } from "@/lib/lookups";
import { fmtDateTime } from "@/lib/format";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import { AUDIT_ACTION_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ExportMenu } from "@/components/ui/export-menu";
import { buttonVariants } from "@/components/ui/button";
import { formatAuditMeta } from "@/lib/audit-meta";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nhật ký hệ thống" };

const ACTION = AUDIT_ACTION_LABEL;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actorId?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireCap("mod:nhat-ky");
  const sp = await searchParams;
  const action = (sp.action ?? "").trim();
  const actorId = (sp.actorId ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const page = parsePage(sp.page);

  const where: Prisma.AuditLogWhereInput = {};
  if (action && action in ACTION) where.action = action;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.at = {
      ...(from && !Number.isNaN(new Date(from).getTime()) ? { gte: startOfDay(new Date(from)) } : {}),
      ...(to && !Number.isNaN(new Date(to).getTime()) ? { lte: endOfDay(new Date(to)) } : {}),
    };
  }

  const [logs, total, staff] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { actor: { select: { fullName: true } } },
    }),
    prisma.auditLog.count({ where }),
    getConsultants(),
  ]);
  const totalPages = totalPagesOf(total);
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/nhat-ky${s ? `?${s}` : ""}`;
  };
  const hasFilter = Boolean(action || actorId || from || to);
  const exportQs = makeHref(1).replace("/nhat-ky", "").replace(/^\?/, "");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký hệ thống"
        description={`${total} bản ghi. Theo dõi các thao tác quan trọng: đăng nhập, sửa/xóa tiền, xóa hồ sơ, áp voucher, xem số điện thoại…`}
        icon={<ScrollText className="h-5 w-5" />}
        actions={
          <ExportMenu
            excelHref={`/nhat-ky/export?format=xlsx${exportQs ? `&${exportQs}` : ""}`}
            wordHref={`/nhat-ky/export?format=doc${exportQs ? `&${exportQs}` : ""}`}
            csvHref={`/nhat-ky/export?format=csv${exportQs ? `&${exportQs}` : ""}`}
          />
        }
      />
      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <form action="/nhat-ky" className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Hành động</label>
              <select
                name="action"
                defaultValue={action}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
              >
                <option value="">Tất cả</option>
                {Object.entries(ACTION).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Người thực hiện</label>
              <select
                name="actorId"
                defaultValue={actorId}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
              >
                <option value="">Tất cả</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Từ ngày</label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Đến ngày</label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-brand-500"
              />
            </div>
            <button className={buttonVariants({ variant: "secondary", size: "sm" })}>Lọc</button>
            {hasFilter && (
              <a href="/nhat-ky" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Xóa lọc
              </a>
            )}
          </form>
        </div>
        <CardContent className="pt-5">
          {logs.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title={hasFilter ? "Không có bản ghi phù hợp bộ lọc" : "Chưa có nhật ký"}
              description={hasFilter ? "Thử bỏ bớt điều kiện lọc." : undefined}
            />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Thời gian</TH>
                  <TH>Người thực hiện</TH>
                  <TH>Hành động</TH>
                  <TH>Chi tiết</TH>
                  <TH>IP</TH>
                </TR>
              </THead>
              <tbody>
                {logs.map((l) => {
                  const a = ACTION[l.action] ?? { label: l.action, tone: "slate" as Tone };
                  return (
                    <TR key={l.id}>
                      <TD className="whitespace-nowrap text-slate-500">{fmtDateTime(l.at)}</TD>
                      <TD className="font-medium text-slate-800">{l.actor?.fullName ?? "—"}</TD>
                      <TD>
                        <Badge tone={a.tone}>{a.label}</Badge>
                      </TD>
                      <TD className="text-slate-500">{[l.entity, formatAuditMeta(l.meta)].filter(Boolean).join(" · ") || "—"}</TD>
                      <TD className="text-slate-400">{l.ip ?? "—"}</TD>
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
