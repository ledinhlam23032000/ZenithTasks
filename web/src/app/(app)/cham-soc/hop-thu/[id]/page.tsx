import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2, Link2Off, Search, AlertTriangle, ExternalLink, MessageCircle, UserRound, PanelRight } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { fmtRelative } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ContactButtons } from "@/components/ui/contact-buttons";
import { buttonVariants } from "@/components/ui/button";
import { markConversationRead, linkConversationToCustomer, unlinkConversationCustomer } from "../actions";
import { revealPhone } from "@/app/(app)/khach-hang/actions";
import { withinResponseWindow, RESPONSE_WINDOW_HOURS } from "@/lib/channels/conversations";
import { aiConfigured } from "@/lib/ai";
import { MessageComposer } from "./message-composer";
import { MessageThread } from "./message-thread";
import type { ChannelKind } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hội thoại — Hộp thư" };

const CHANNEL_LABEL: Record<ChannelKind, { label: string; tone: "blue" | "purple" }> = {
  ZALO_OA: { label: "Zalo OA", tone: "blue" },
  FACEBOOK: { label: "Facebook", tone: "purple" },
};

const MESSAGE_LIMIT = 200;

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qkh?: string }>;
}) {
  const user = await requireCap("mod:cham-soc-hop-thu");
  const canManage = !isShareholder(user.role);
  const { id } = await params;
  const sp = await searchParams;
  const qkh = (sp.qkh ?? "").trim();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      channelAccount: true,
      customer: { select: { id: true, fullName: true, code: true, phoneLast5: true } },
      messages: { orderBy: { createdAt: "desc" }, take: MESSAGE_LIMIT, include: { sentBy: { select: { fullName: true } } } },
    },
  });
  if (!conversation) notFound();

  if (conversation.unreadCount > 0 && canManage) await markConversationRead(conversation.id);

  const messages = conversation.messages.slice().reverse();
  const lastInbound = messages.filter((m) => m.direction === "IN").at(-1);
  const withinWindow = withinResponseWindow(conversation.kind, lastInbound?.createdAt ?? null);
  const ch = CHANNEL_LABEL[conversation.kind];
  const name = conversation.customer?.fullName ?? conversation.displayName ?? "Người dùng chưa rõ tên";
  const pageName = conversation.channelAccount.externalName ?? conversation.channelAccount.label;
  const pageUrl = conversation.kind === "FACEBOOK" && conversation.channelAccount.externalId
    ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(conversation.channelAccount.externalId)}`
    : null;

  const searchResults =
    canManage && !conversation.customer && qkh
      ? await prisma.customer.findMany({
          where: isValidLast5(qkh) ? { phoneLast5: qkh } : { fullName: { contains: qkh, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, fullName: true, code: true, phoneLast5: true },
        })
      : [];

  let disabledReason: string | undefined;
  if (!conversation.channelAccount.active) disabledReason = "Kênh này đã ngắt kết nối — vào Kết nối kênh để kết nối lại trước khi gửi.";

  const threadMessages = messages.map((m) => ({
    id: m.id,
    direction: m.direction,
    status: m.status,
    text: m.text,
    attachments: Array.isArray(m.attachments) ? (m.attachments as Array<{ type?: string; url?: string; name?: string }>) : [],
    createdAt: m.createdAt.toISOString(),
    sentByName: m.sentBy?.fullName ?? null,
    errorMessage: m.errorMessage,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/cham-soc/hop-thu" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Quay lại hộp thư
        </Link>
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><PanelRight className="h-3.5 w-3.5" /> Chọn hội thoại khác từ Hộp thư</div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="flex flex-wrap items-center gap-3 py-3.5">
              <Avatar name={name} src={conversation.avatarUrl} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-slate-900">{name}</span>
                  <Badge tone={ch.tone}>{ch.label}</Badge>
                  <span className="max-w-[18rem] truncate rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700" title={pageName}>Page: {pageName}</span>
                  {!conversation.channelAccount.active && <Badge tone="red">Kênh đã ngắt</Badge>}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400"><MessageCircle className="h-3.5 w-3.5" /> Tin nhắn mới nhất ở dưới cùng</p>
              </div>
              {pageUrl && <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"><ExternalLink className="h-3.5 w-3.5" /> Mở Page</a>}
              {canManage && conversation.customer && <form action={unlinkConversationCustomer}><input type="hidden" name="conversationId" value={conversation.id} /><button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"><Link2Off className="h-3.5 w-3.5" /> Bỏ gắn</button></form>}
            </CardContent>
          </Card>

          {!withinWindow && lastInbound && conversation.channelAccount.active && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Khách nhắn lần cuối {fmtRelative(lastInbound.createdAt)} — đã ngoài khung ~{RESPONSE_WINDOW_HOURS[conversation.kind]} giờ. Vẫn có thể thử gửi; nếu nền tảng từ chối, lỗi sẽ hiện dưới ô nhập.</span></div>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3"><div><p className="text-sm font-semibold text-slate-800">Cuộc trò chuyện</p><p className="text-xs text-slate-400">{messages.length} tin gần nhất · cuộn để xem lịch sử</p></div><Badge tone={conversation.unreadCount > 0 ? "pink" : "slate"}>{conversation.unreadCount > 0 ? `${conversation.unreadCount} chưa đọc` : "Đã đọc"}</Badge></div>
            <MessageThread messages={threadMessages} />
            <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
              {canManage ? <MessageComposer conversationId={conversation.id} aiEnabled={aiConfigured()} disabled={!!disabledReason} disabledReason={disabledReason} /> : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500">Vai trò Cổ đông chỉ xem, không gửi tin được ở hộp thư.</p>}
            </div>
          </Card>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card><CardContent className="space-y-4 p-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nguồn hội thoại</p><div className="mt-2 flex items-center gap-2.5"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><MessageCircle className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{pageName}</p><p className="text-xs text-slate-400">{ch.label} · {conversation.channelAccount.active ? "Đang kết nối" : "Đã ngắt"}</p></div></div>{pageUrl && <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">Mở trang Fanpage <ExternalLink className="h-3 w-3" /></a>}</div>
            <div className="border-t border-slate-100 pt-4"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hồ sơ khách</p></div>{conversation.customer ? <><Link href={`/khach-hang/${conversation.customer.id}`} className="mt-2 block rounded-xl bg-slate-50 p-3 hover:bg-brand-50"><p className="text-sm font-semibold text-slate-800">{conversation.customer.fullName}</p><p className="mt-0.5 text-xs text-slate-400">{conversation.customer.code} · {maskPhone(conversation.customer.phoneLast5)}</p></Link>{canManage && <div className="mt-2"><ContactButtons reveal={revealPhone.bind(null, conversation.customer.id)} last5={conversation.customer.phoneLast5} /></div>}</> : <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Chưa gắn với hồ sơ khách. Hãy tìm theo tên hoặc 5 số cuối để quản lý lịch sử và công nợ.</p>}</div>
          </CardContent></Card>

          {canManage && !conversation.customer && <Card><CardContent className="p-4"><p className="text-sm font-semibold text-slate-800">Gắn hồ sơ khách</p><form action={`/cham-soc/hop-thu/${conversation.id}`} className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="qkh" defaultValue={qkh} placeholder="Tên hoặc 5 số cuối" className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" /></div><button className={buttonVariants({ variant: "secondary", size: "sm" })}>Tìm</button></form>{qkh && <ul className="mt-2 space-y-1.5">{searchResults.length === 0 && <li className="text-xs text-slate-400">Không tìm thấy khách phù hợp.</li>}{searchResults.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-xs"><span className="min-w-0 truncate">{c.fullName}<span className="text-slate-400"> · {c.code} · {maskPhone(c.phoneLast5)}</span></span><form action={linkConversationToCustomer}><input type="hidden" name="conversationId" value={conversation.id} /><input type="hidden" name="customerId" value={c.id} /><button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold text-brand-600 hover:bg-brand-50"><Link2 className="h-3.5 w-3.5" /> Gắn</button></form></li>)}</ul>}</CardContent></Card>}
        </aside>
      </div>
    </div>
  );
}
