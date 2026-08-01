import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtRelative } from "@/lib/format";
import type { InboxViewModel } from "./inbox-view-model";

type ConversationItem = InboxViewModel["conversations"][number];

export function ConversationList({ items, selectedId, queue, provider, q }: { items: ConversationItem[]; selectedId?: string; queue: string; provider?: string; q?: string }) {
  const base = new URLSearchParams({ tab: "inbox", queue });
  if (provider) base.set("provider", provider);
  if (q) base.set("q", q);

  return <section aria-label="Danh sách hội thoại" className={cn("min-h-[560px] border-r border-slate-200 bg-white", selectedId && "hidden lg:block")}>
    <div className="border-b border-slate-100 p-3">
      <form action="/cham-soc" className="space-y-2">
        <input type="hidden" name="tab" value="inbox" /><input type="hidden" name="queue" value={queue} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Tìm tên người nhắn…" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white" />
        </div>
        <div className="flex gap-2"><select name="provider" defaultValue={provider ?? ""} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-600">
          <option value="">Zalo OA + Facebook</option><option value="ZALO_OA">Zalo OA</option><option value="FACEBOOK_PAGE">Facebook</option>
        </select><button className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700">Lọc</button></div>
      </form>
    </div>
    {items.length === 0 ? <div className="px-5 py-16 text-center text-sm text-slate-500"><MessageCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />Chưa có hội thoại trong hàng chờ này.</div> : <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const params = new URLSearchParams(base); params.set("conversation", item.id);
        return <li key={item.id}>
          <Link href={`/cham-soc?${params}`} className={cn("block px-4 py-3.5 transition-colors hover:bg-slate-50", item.id === selectedId && "bg-brand-50/80 ring-1 ring-inset ring-brand-100")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.contactName}</p><p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.providerLabel}</p></div>
              <div className="shrink-0 text-right">{item.lastMessageAt && <time className="text-[11px] text-slate-400">{fmtRelative(new Date(item.lastMessageAt))}</time>}{item.unreadCount > 0 && <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white">{item.unreadCount}</span>}</div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.preview}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px]"><span className={cn("rounded-full px-2 py-0.5", item.customerId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{item.customerLabel}</span>{item.overdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">Quá hạn phản hồi</span>}</div>
          </Link>
        </li>;
      })}
    </ul>}
  </section>;
}
