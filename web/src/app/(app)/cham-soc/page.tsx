import Link from "next/link";
import { ClipboardList, MessageCircleHeart, MessagesSquare } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import type { ChannelProvider } from "@/generated/prisma/client";
import { InboxShell } from "./inbox-shell";
import { ManualLog } from "./manual-log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chăm sóc khách hàng" };

type Search = { tab?: string; queue?: string; provider?: string; conversation?: string; q?: string; kenh?: string };

export default async function CarePage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireCap("mod:cham-soc");
  const sp = await searchParams;
  const omnichannelEnabled = process.env.OMNICHANNEL_ENABLED === "true";
  const canUseInbox = omnichannelEnabled && userCan(user, "inbox.view");
  const tab = canUseInbox && sp.tab !== "manual" ? "inbox" : "manual";
  const queue = sp.queue === "unassigned" || sp.queue === "all" ? sp.queue : "mine";
  const provider = sp.provider === "ZALO_OA" || sp.provider === "FACEBOOK_PAGE" ? sp.provider as ChannelProvider : undefined;
  const q = (sp.q ?? "").trim();

  return <div className="space-y-5">
    <PageHeader title="Chăm sóc khách hàng" description={canUseInbox ? "Nhận và trả lời tin nhắn mới từ Zalo OA, Facebook Fanpage ngay trong ZenithTasks." : "Nhật ký chăm sóc khách hàng của bộ phận CSKH."} icon={<MessageCircleHeart className="h-5 w-5" />} />
    {canUseInbox && <nav aria-label="Loại hộp thư" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <Link href="/cham-soc?tab=inbox&queue=mine" className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium", tab === "inbox" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50")}><MessagesSquare className="h-4 w-4" />Hộp thư mới</Link>
      <Link href="/cham-soc?tab=manual" className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium", tab === "manual" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50")}><ClipboardList className="h-4 w-4" />Nhật ký thủ công</Link>
    </nav>}
    {tab === "inbox" ? <InboxShell user={user} queue={queue} provider={provider} q={q || undefined} conversationId={sp.conversation} /> : <ManualLog user={user} q={q} kenh={(sp.kenh ?? "").trim()} />}
  </div>;
}
