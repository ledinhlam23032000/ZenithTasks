"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removeAssistantConversation } from "./conversation-actions";

type HistoryItem = {
  id: string;
  title: string | null;
  status: "OPEN" | "ARCHIVED";
  lastMessageAt: Date;
};

export function ConversationHistory({ history, currentId }: { history: HistoryItem[]; currentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(item: HistoryItem) {
    const label = item.title || "Cuộc trò chuyện mới";
    if (!window.confirm(`Xóa vĩnh viễn “${label}”? Chỉ xóa lịch sử trợ lý và tin nhắn trong phiên này; không xóa khách, tiền, lương hay dữ liệu nghiệp vụ.`)) return;
    startTransition(async () => {
      const result = await removeAssistantConversation(item.id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.push("/tro-ly");
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      {history.length === 0 && <p className="px-2 py-3 text-xs text-slate-400">Chưa có phiên đã lưu.</p>}
      {history.map((item) => (
        <div key={item.id} className={`group flex items-start gap-1 rounded-xl px-2.5 py-2 transition ${item.id === currentId ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}>
          <Link href={`/tro-ly?c=${item.id}`} className="min-w-0 flex-1">
            <span className="block truncate text-xs">{item.title || "Cuộc trò chuyện mới"}</span>
            <span className="mt-0.5 block text-[10px] font-normal text-slate-400">{item.status === "ARCHIVED" ? "Đã lưu trữ" : "Đang mở"} · {new Date(item.lastMessageAt).toLocaleDateString("vi-VN")}</span>
          </Link>
          <button type="button" onClick={() => remove(item)} disabled={pending} title="Xóa phiên này" aria-label={`Xóa ${item.title || "cuộc trò chuyện"}`} className="mt-0.5 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
