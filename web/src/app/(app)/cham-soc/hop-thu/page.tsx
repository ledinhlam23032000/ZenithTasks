import Link from "next/link";
import { Inbox, Search, MessageCircle, Plug } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { careTabs } from "@/lib/nav-tabs";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import type { Prisma, ChannelKind } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hộp thư — Chăm sóc khách hàng" };

const CHANNEL_LABEL: Record<ChannelKind, { label: string; tone: "blue" | "purple" }> = {
  ZALO_OA: { label: "Zalo OA", tone: "blue" },
  FACEBOOK: { label: "Facebook", tone: "purple" },
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kenh?: string; pageId?: string; chuadoc?: string; page?: string }>;
}) {
  const user = await requireCap("mod:cham-soc-hop-thu");
  const canManage = !isShareholder(user.role);
  const canConfigure = userCan(user, "mod:ket-noi-kenh");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const kenh = (sp.kenh ?? "").trim();
  const pageId = (sp.pageId ?? "").trim();
  const unreadOnly = sp.chuadoc === "1";
  const page = parsePage(sp.page);

  const where: Prisma.ConversationWhereInput = {};
  if (kenh === "ZALO_OA" || kenh === "FACEBOOK") where.kind = kenh;
  if (pageId) where.channelAccountId = pageId;
  if (unreadOnly) where.unreadCount = { gt: 0 };
  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { customer: isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [conversations, total, unreadCount, channelAccounts] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
        channelAccount: { select: { id: true, label: true, externalName: true, active: true } },
      },
    }),
    prisma.conversation.count({ where }),
    prisma.conversation.count({ where: { unreadCount: { gt: 0 } } }),
    prisma.channelAccount.findMany({ orderBy: [{ kind: "asc" }, { label: "asc" }], select: { id: true, kind: true, label: true, externalName: true, active: true } }),
  ]);
  const totalPages = totalPagesOf(total);
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kenh) params.set("kenh", kenh);
    if (pageId) params.set("pageId", pageId);
    if (unreadOnly) params.set("chuadoc", "1");
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/cham-soc/hop-thu${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hộp thư"
        description="Tin nhắn Zalo OA + Facebook Messenger gộp về 1 chỗ — trả lời ngay, gắn hồ sơ khách khi nhận ra."
        icon={<Inbox className="h-5 w-5" />}
      />
      <PageTabs tabs={careTabs(user)} />

      {channelAccounts.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Plug className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Chưa kết nối kênh nào</p>
                <p className="text-sm text-amber-700">Kết nối Zalo OA hoặc Facebook Page để tin nhắn khách tự động hiện ở đây.</p>
              </div>
            </div>
            {canConfigure && (
              <Link href="/cham-soc/ket-noi" className={buttonVariants({ size: "sm" })}>
                Kết nối kênh
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Chưa đọc" value={unreadCount} icon={<MessageCircle className="h-5 w-5" />} tone="pink" />
        <StatCard label="Tổng phù hợp bộ lọc" value={total} icon={<Inbox className="h-5 w-5" />} tone="slate" />
      </div>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <form action="/cham-soc/hop-thu" className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên hoặc 5 số cuối (nếu đã gắn khách)…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <select
              name="kenh"
              defaultValue={kenh}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="">Tất cả kênh</option>
              <option value="ZALO_OA">Zalo OA</option>
              <option value="FACEBOOK">Facebook</option>
            </select>
            <select
              name="pageId"
              defaultValue={pageId}
              className="h-10 min-w-[190px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="">Tất cả Page/OA</option>
              {channelAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.externalName || a.label) + (a.active ? "" : " (đã ngắt)")}
                </option>
              ))}
            </select>
            <label className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">
              <input type="checkbox" name="chuadoc" value="1" defaultChecked={unreadOnly} className="accent-brand-600" />
              Chỉ chưa đọc
            </label>
            <button className={buttonVariants({ variant: "secondary" })}>Lọc</button>
          </form>
        </div>

        <CardContent className="pt-4">
          {conversations.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="Chưa có hội thoại nào"
              description="Tin nhắn khách gửi tới Zalo OA/Facebook đã kết nối sẽ tự hiện ở đây."
            />
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => {
                const ch = CHANNEL_LABEL[c.kind];
                const name = c.customer?.fullName ?? c.displayName ?? "Người dùng chưa rõ tên";
                const unread = c.unreadCount > 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/cham-soc/hop-thu/${c.id}`}
                      className={`flex gap-3 rounded-xl border p-3.5 transition-colors hover:border-brand-200 hover:bg-brand-50/30 ${
                        unread ? "border-brand-200 bg-brand-50/40" : "border-slate-100"
                      }`}
                    >
                      <Avatar name={name} src={c.avatarUrl} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`truncate font-medium ${unread ? "text-slate-900" : "text-slate-700"}`}>{name}</span>
                          {c.customer && (
                            <>
                              <span className="text-xs text-slate-300">·</span>
                              <span className="text-xs text-slate-400">
                                {c.customer.code} · {maskPhone(c.customer.phoneLast5)}
                              </span>
                            </>
                          )}
                          <Badge tone={ch.tone}>{ch.label}</Badge>
                          <span className="max-w-[18rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={c.channelAccount.externalName ?? c.channelAccount.label}>
                            Page: {c.channelAccount.externalName ?? c.channelAccount.label}
                          </span>
                          {!c.channelAccount.active && <Badge tone="red">Kênh đã ngắt</Badge>}
                          {unread && <Badge tone="pink">{c.unreadCount} mới</Badge>}
                        </div>
                        <p className={`mt-1 truncate text-sm ${unread ? "font-medium text-slate-800" : "text-slate-500"}`}>
                          {c.lastDirection === "OUT" && <span className="text-slate-400">Bạn: </span>}
                          {c.lastMessagePreview || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400" title={fmtDateTime(c.lastMessageAt)}>
                        {fmtRelative(c.lastMessageAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </Card>
      {!canManage && <p className="text-xs text-slate-400">Vai trò Cổ đông chỉ xem, không gửi/gắn hồ sơ được ở hộp thư.</p>}
    </div>
  );
}
