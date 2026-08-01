import Link from "next/link";
import { Cable, Inbox, MessageCircle, Settings2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { userCan } from "@/lib/permissions";
import { buttonVariants } from "@/components/ui/button";
import type { SafeUser } from "@/lib/auth";
import type { ChannelProvider } from "@/generated/prisma/client";
import { ConversationList } from "./conversation-list";
import { ConversationPane } from "./conversation-pane";
import { CustomerContext } from "./customer-context";
import { InboxPoller } from "./inbox-poller";
import { getInboxConversation, listInbox } from "./inbox-queries";
import { buildInboxViewModel } from "./inbox-view-model";

type Queue = "unassigned" | "mine" | "all";

export async function InboxShell({ user, queue, provider, q, conversationId }: { user: SafeUser; queue: Queue; provider?: ChannelProvider; q?: string; conversationId?: string }) {
  const [accounts, conversations] = await Promise.all([
    prisma.channelAccount.findMany({ select: { id: true, provider: true, displayName: true, status: true }, orderBy: { provider: "asc" } }),
    listInbox({ queue, provider, q, user }),
  ]);
  const selectedId = conversationId && conversations.some((item) => item.id === conversationId) ? conversationId : undefined;
  const selected = selectedId ? await getInboxConversation(selectedId, user) : null;
  const [assignees, customers] = selected ? await Promise.all([
    prisma.user.findMany({ where: { active: true, role: { in: ["ADMIN", "MANAGER", "CARE"] } }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    selected.thread.channelContact.customerId ? Promise.resolve([]) : prisma.customer.findMany({ select: { id: true, code: true, fullName: true, phoneLast5: true }, orderBy: { updatedAt: "desc" }, take: 150 }),
  ]) : [[], []];

  const vm = buildInboxViewModel({
    enabled: true,
    now: new Date(),
    user,
    conversations,
    selected: selected ? {
      id: selected.id,
      customerId: selected.thread.channelContact.customerId,
      provider: selected.thread.channelAccount.provider,
      messages: selected.messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        type: message.type,
        content: message.content,
        status: message.status,
        providerErrorMessage: message.providerErrorMessage,
        createdAt: message.createdAt,
        attachmentIds: message.attachments.filter((attachment) => attachment.status === "READY").map((attachment) => attachment.id),
      })),
      presence: selected.presence.filter((presence) => presence.userId !== user.id).map((presence) => ({ userId: presence.userId, fullName: presence.user.fullName, isTyping: presence.isTyping })),
    } : null,
  });

  if (accounts.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Cable className="h-7 w-7" /></div>
    <h2 className="mt-5 text-xl font-semibold text-slate-900">Kết nối kênh để bắt đầu nhận tin mới</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Đăng nhập Zalo OA và Facebook Fanpage một lần. Sau khi kết nối, tin nhắn mới sẽ tự xuất hiện tại đây để đội CSKH trả lời trong ZenithTasks.</p>
    {userCan(user, "inbox.manageChannels") && <Link href="/cham-soc/cai-dat" className={buttonVariants({ className: "mt-5" })}><Settings2 className="h-4 w-4" />Mở cài đặt kết nối</Link>}
  </div>;

  const queueLink = (value: Queue) => {
    const params = new URLSearchParams({ tab: "inbox", queue: value }); if (provider) params.set("provider", provider); if (q) params.set("q", q); return `/cham-soc?${params}`;
  };
  const back = new URLSearchParams({ tab: "inbox", queue }); if (provider) back.set("provider", provider); if (q) back.set("q", q);
  const selectedCustomer = selected?.thread.channelContact.customer ?? null;
  const selectedContactName = selected?.thread.channelContact.displayName ?? "Khách chưa xác định";

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <nav aria-label="Hàng chờ" className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {([['unassigned', 'Chưa phân công'], ['mine', 'Của tôi'], ['all', 'Tất cả']] as const).map(([value, label]) => <Link key={value} href={queueLink(value)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${queue === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</Link>)}
      </nav>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {accounts.map((account) => <span key={account.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1"><span className={`h-2 w-2 rounded-full ${account.status === "CONNECTED" ? "bg-emerald-500" : account.status === "DEGRADED" ? "bg-amber-500" : "bg-rose-500"}`} />{account.provider === "ZALO_OA" ? <Inbox className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}{account.displayName}</span>)}
        {userCan(user, "inbox.manageChannels") && <Link href="/cham-soc/cai-dat" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><Settings2 className="h-3.5 w-3.5" />Cài đặt</Link>}
      </div>
    </div>
    <div className="grid min-h-[560px] lg:grid-cols-[320px_minmax(420px,1fr)_280px]">
      <ConversationList items={vm.conversations} selectedId={selectedId} queue={queue} provider={provider} q={q} />
      {vm.selected && selected ? <>
        <ConversationPane selected={vm.selected} contactName={selectedContactName} status={selected.status} assigneeId={selected.assigneeId} assignees={assignees} canReply={userCan(user, "inbox.reply")} canAssign={userCan(user, "inbox.assign")} backHref={`/cham-soc?${back}`} />
        <CustomerContext conversationId={selected.id} contactName={selectedContactName} customer={selectedCustomer} customers={customers} canLink={userCan(user, "inbox.linkCustomer")} />
      </> : <div className="hidden items-center justify-center p-10 text-center text-sm text-slate-500 lg:col-span-2 lg:flex">Chọn một hội thoại để bắt đầu xử lý.</div>}
    </div>
    <InboxPoller conversationId={selectedId} />
  </div>;
}
