import Link from "next/link";
import { MessageCircleHeart, Search, Inbox } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { todayRange } from "@/lib/dates";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { CARE_CHANNEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { PageTabs } from "@/components/ui/page-tabs";
import { careTabs } from "@/lib/nav-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditCareButton } from "./care-actions";
import { deleteCareMessage } from "./actions";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import type { Prisma, CareChannel } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chăm sóc khách hàng" };

export default async function CarePage({ searchParams }: { searchParams: Promise<{ q?: string; kenh?: string; page?: string }> }) {
  const user = await requireCap("mod:cham-soc");
  const canManage = !isShareholder(user.role);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const kenh = (sp.kenh ?? "").trim();
  const page = parsePage(sp.page);
  const now = new Date();

  const where: Prisma.CareMessageWhereInput = {};
  if (q) where.customer = isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } };
  if (kenh && kenh in CARE_CHANNEL) where.channel = kenh as CareChannel;

  const [messages, total, todayCount, weekCount] = await Promise.all([
    prisma.careMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.careMessage.count({ where }),
    prisma.careMessage.count({ where: { createdAt: todayRange() } }),
    prisma.careMessage.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
  ]);
  const totalPages = totalPagesOf(total);
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kenh) params.set("kenh", kenh);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/cham-soc${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chăm sóc khách hàng"
        description="Toàn bộ tin nhắn & ghi nhận chăm sóc của bộ phận CSKH — hiển thị minh bạch cho quản trị."
        icon={<MessageCircleHeart className="h-5 w-5" />}
      />
      <PageTabs tabs={careTabs(user)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tin chăm sóc hôm nay" value={todayCount} icon={<MessageCircleHeart className="h-5 w-5" />} tone="pink" />
        <StatCard label="Trong 7 ngày" value={weekCount} icon={<MessageCircleHeart className="h-5 w-5" />} tone="purple" />
        <StatCard label="Tổng phù hợp bộ lọc" value={total} icon={<Inbox className="h-5 w-5" />} tone="slate" />
      </div>

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <form action="/cham-soc" className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Lọc theo tên khách hoặc 5 số cuối…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <select
              name="kenh"
              defaultValue={kenh}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="">Tất cả kênh</option>
              {Object.entries(CARE_CHANNEL).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className={buttonVariants({ variant: "secondary" })}>Lọc</button>
          </form>
        </div>

        <CardContent className="pt-4">
          {messages.length === 0 ? (
            <EmptyState
              icon={<MessageCircleHeart className="h-6 w-6" />}
              title="Chưa có tin chăm sóc"
              description="Tin nhắn CSKH được tạo từ trang hồ sơ của từng khách hàng."
            />
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const ch = CARE_CHANNEL[m.channel];
                return (
                  <li key={m.id} className="flex gap-3 rounded-xl border border-slate-100 p-3.5">
                    <Avatar name={m.customer.fullName} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/khach-hang/${m.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                          {m.customer.fullName}
                        </Link>
                        <span className="text-xs text-slate-400">{m.customer.code}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{maskPhone(m.customer.phoneLast5)}</span>
                        <Badge tone={ch.tone}>{ch.label}</Badge>
                        <Badge tone={m.direction === "IN" ? "amber" : "slate"}>
                          {m.direction === "IN" ? "Khách phản hồi" : "Gửi khách"}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-700">{m.content}</p>
                      <p className="mt-1 text-xs text-slate-400" title={fmtDateTime(m.createdAt)}>
                        {m.createdBy?.fullName ?? "Hệ thống"} · {fmtRelative(m.createdAt)}
                      </p>
                    </div>
                    {canManage && (
                    <div className="flex shrink-0 items-start gap-0.5">
                      <EditCareButton message={{ id: m.id, channel: m.channel, direction: m.direction, content: m.content }} />
                      <DeleteButton
                        action={deleteCareMessage}
                        id={m.id}
                        label=""
                        confirmText={`Xóa tin chăm sóc của ${m.customer.fullName}?`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                      />
                    </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
      </Card>
    </div>
  );
}
