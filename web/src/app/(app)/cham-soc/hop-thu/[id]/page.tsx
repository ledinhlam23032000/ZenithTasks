import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip, Link2, Link2Off, Search, AlertTriangle } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { isShareholder } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { fmtTime, fmtDayLabel, fmtRelative } from "@/lib/format";
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

  return (
    <div className="space-y-4">
      <Link href="/cham-soc/hop-thu" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Quay lại hộp thư
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Avatar name={name} src={conversation.avatarUrl} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{name}</span>
              <Badge tone={ch.tone}>{ch.label}</Badge>
              {!conversation.channelAccount.active && <Badge tone="red">Kênh đã ngắt</Badge>}
            </div>
            {conversation.customer ? (
              <>
                <p className="mt-0.5 text-xs text-slate-400">
                  Đã gắn:{" "}
                  <Link href={`/khach-hang/${conversation.customer.id}`} className="text-brand-600 hover:underline">
                    {conversation.customer.fullName} · {conversation.customer.code}
                  </Link>
                </p>
                {canManage && (
                  <div className="mt-1">
                    <ContactButtons reveal={revealPhone.bind(null, conversation.customer.id)} last5={conversation.customer.phoneLast5} />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-xs text-slate-400">Chưa gắn hồ sơ khách hàng nào.</p>
            )}
          </div>
          {canManage && conversation.customer && (
            <form action={unlinkConversationCustomer}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                <Link2Off className="h-3.5 w-3.5" /> Bỏ gắn
              </button>
            </form>
          )}
        </CardContent>

        {canManage && !conversation.customer && (
          <CardContent className="border-t border-slate-100 pt-4">
            <form action={`/cham-soc/hop-thu/${conversation.id}`} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="qkh"
                  defaultValue={qkh}
                  placeholder="Tìm hồ sơ khách theo tên hoặc 5 số cuối để gắn…"
                  className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <button className={buttonVariants({ variant: "secondary", size: "sm" })}>Tìm</button>
            </form>
            {qkh && (
              <ul className="mt-2 space-y-1.5">
                {searchResults.length === 0 && <li className="text-xs text-slate-400">Không tìm thấy khách phù hợp.</li>}
                {searchResults.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="truncate">
                      {c.fullName} <span className="text-xs text-slate-400">· {c.code} · {maskPhone(c.phoneLast5)}</span>
                    </span>
                    <form action={linkConversationToCustomer}>
                      <input type="hidden" name="conversationId" value={conversation.id} />
                      <input type="hidden" name="customerId" value={c.id} />
                      <button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
                        <Link2 className="h-3.5 w-3.5" /> Gắn
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        )}
      </Card>

      {!withinWindow && lastInbound && conversation.channelAccount.active && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Khách nhắn lần cuối {fmtRelative(lastInbound.createdAt)} — đã ngoài khung ~{RESPONSE_WINDOW_HOURS[conversation.kind]} giờ nền tảng
            thường cho phép chủ động trả lời tự do. Vẫn có thể thử gửi; nếu nền tảng từ chối, lỗi sẽ hiện ngay dưới ô nhập.
          </span>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có tin nhắn nào trong hội thoại này.</p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDay = !prev || fmtDayLabel(prev.createdAt) !== fmtDayLabel(m.createdAt);
              const out = m.direction === "OUT";
              const attachments = Array.isArray(m.attachments) ? (m.attachments as Array<{ type?: string; url?: string }>) : [];
              return (
                <div key={m.id}>
                  {showDay && <p className="my-3 text-center text-xs font-medium capitalize text-slate-400">{fmtDayLabel(m.createdAt)}</p>}
                  <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[65%] ${out ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {attachments.map((a, ai) =>
                        a.url ? (
                          <a
                            key={ai}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-1 flex items-center gap-1.5 text-xs underline ${out ? "text-brand-50" : "text-brand-600"}`}
                          >
                            <Paperclip className="h-3.5 w-3.5" /> Xem tệp đính kèm
                          </a>
                        ) : null,
                      )}
                      <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${out ? "text-brand-100" : "text-slate-400"}`}>
                        <span>{fmtTime(m.createdAt)}</span>
                        {out && m.sentBy && <span>· {m.sentBy.fullName}</span>}
                        {out && m.status === "FAILED" && <span className="font-medium text-rose-200" title={m.errorMessage ?? ""}>· Gửi lỗi</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <MessageComposer conversationId={conversation.id} aiEnabled={aiConfigured()} disabled={!!disabledReason} disabledReason={disabledReason} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500">Vai trò Cổ đông chỉ xem, không gửi tin được ở hộp thư.</p>
      )}
    </div>
  );
}
