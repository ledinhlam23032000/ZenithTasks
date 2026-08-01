import Link from "next/link";
import { MessageCircleHeart, Search, Inbox } from "lucide-react";
import { isShareholder } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { todayRange } from "@/lib/dates";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { CARE_CHANNEL } from "@/lib/status";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditCareButton } from "./care-actions";
import { deleteCareMessage } from "./actions";
import type { SafeUser } from "@/lib/auth";
import type { Prisma, CareChannel } from "@/generated/prisma/client";

export async function ManualLog({ user, q, kenh }: { user: SafeUser; q: string; kenh: string }) {
  const canManage = !isShareholder(user.role);
  const where: Prisma.CareMessageWhereInput = {};
  if (q) where.customer = isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } };
  if (kenh && kenh in CARE_CHANNEL) where.channel = kenh as CareChannel;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [messages, todayCount, weekCount] = await Promise.all([
    prisma.careMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } }, createdBy: { select: { fullName: true } } },
    }),
    prisma.careMessage.count({ where: { createdAt: todayRange() } }),
    prisma.careMessage.count({ where: { createdAt: { gte: weekStart } } }),
  ]);

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Tin chăm sóc hôm nay" value={todayCount} icon={<MessageCircleHeart className="h-5 w-5" />} tone="pink" />
      <StatCard label="Trong 7 ngày" value={weekCount} icon={<MessageCircleHeart className="h-5 w-5" />} tone="purple" />
      <StatCard label="Tổng hiển thị" value={messages.length} icon={<Inbox className="h-5 w-5" />} tone="slate" />
    </div>

    <Card>
      <div className="border-b border-slate-100 px-4 py-3">
        <form action="/cham-soc" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="hidden" name="tab" value="manual" />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Lọc theo tên khách hoặc 5 số cuối…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <select name="kenh" defaultValue={kenh} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500">
            <option value="">Tất cả kênh</option>
            {Object.entries(CARE_CHANNEL).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <button className={buttonVariants({ variant: "secondary" })}>Lọc</button>
        </form>
      </div>
      <CardContent className="pt-4">
        {messages.length === 0 ? <EmptyState icon={<MessageCircleHeart className="h-6 w-6" />} title="Chưa có tin chăm sóc" description="Tin nhắn CSKH được tạo từ trang hồ sơ của từng khách hàng." /> : <ul className="space-y-3">
          {messages.map((message) => {
            const channel = CARE_CHANNEL[message.channel];
            return <li key={message.id} className="flex gap-3 rounded-xl border border-slate-100 p-3.5">
              <Avatar name={message.customer.fullName} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/khach-hang/${message.customer.id}`} className="font-medium text-slate-800 hover:text-brand-600">{message.customer.fullName}</Link>
                  <span className="text-xs text-slate-400">{message.customer.code}</span><span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{maskPhone(message.customer.phoneLast5)}</span>
                  <Badge tone={channel.tone}>{channel.label}</Badge>
                  <Badge tone={message.direction === "IN" ? "amber" : "slate"}>{message.direction === "IN" ? "Khách phản hồi" : "Gửi khách"}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{message.content}</p>
                <p className="mt-1 text-xs text-slate-400" title={fmtDateTime(message.createdAt)}>{message.createdBy?.fullName ?? "Hệ thống"} · {fmtRelative(message.createdAt)}</p>
              </div>
              {canManage && <div className="flex shrink-0 items-start gap-0.5">
                <EditCareButton message={{ id: message.id, channel: message.channel, direction: message.direction, content: message.content }} />
                <DeleteButton action={deleteCareMessage} id={message.id} label="" confirmText={`Xóa tin chăm sóc của ${message.customer.fullName}?`} className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" />
              </div>}
            </li>;
          })}
        </ul>}
      </CardContent>
    </Card>
  </div>;
}
