import Link from "next/link";
import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { shortName } from "@/lib/format";
import { AssistantChat } from "./assistant-chat";
import { getAssistantConversationTurns, getOrCreateAssistantConversation, listAssistantConversations } from "./conversations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trợ lý AI" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await requireCap("mod:tro-ly");
  const aiOn = aiConfigured();
  const sp = await searchParams;
  const conversation = await getOrCreateAssistantConversation(user.id, sp.c);
  const messages = await getAssistantConversationTurns(user.id, conversation.id);
  const history = await listAssistantConversations(user.id);
  return (
    <div className="grid min-h-[calc(100vh-10.5rem)] gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử trợ lý</p>
          <span className="text-[11px] text-slate-400">{history.length}</span>
        </div>
        <div className="space-y-1">
          {history.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">Chưa có phiên đã lưu.</p>}
          {history.map((item) => (
            <Link key={item.id} href={`/tro-ly?c=${item.id}`} className={`block rounded-xl px-2.5 py-2 text-xs transition ${item.id === conversation.id ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}>
              <span className="block truncate">{item.title || "Cuộc trò chuyện mới"}</span>
              <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{item.status === "ARCHIVED" ? "Đã lưu trữ" : "Đang mở"} · {new Date(item.lastMessageAt).toLocaleDateString("vi-VN")}</span>
            </Link>
          ))}
        </div>
      </aside>
      <AssistantChat
        aiOn={aiOn}
        greetName={shortName(user.fullName)}
        conversationId={conversation.id}
        initialMessages={messages}
      />
    </div>
  );
}
