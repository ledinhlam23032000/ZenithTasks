"use client";

import { useEffect, useRef } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { fmtDayLabel, fmtTime } from "@/lib/format";

type Attachment = { type?: string; url?: string; name?: string };
export type ThreadMessage = {
  id: string;
  direction: "IN" | "OUT";
  status: "RECEIVED" | "SENT" | "FAILED";
  text: string | null;
  attachments: Attachment[];
  createdAt: string;
  sentByName: string | null;
  errorMessage: string | null;
};

export function MessageThread({ messages }: { messages: ThreadMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <p className="flex min-h-[22rem] items-center justify-center px-4 text-sm text-slate-400">Chưa có tin nhắn nào trong hội thoại này.</p>;
  }

  return (
    <div className="max-h-[min(58vh,42rem)] min-h-[22rem] space-y-3 overflow-y-auto bg-slate-50/35 px-3 py-4 sm:px-5">
      {messages.map((m, i) => {
        const date = new Date(m.createdAt);
        const previous = i > 0 ? new Date(messages[i - 1]!.createdAt) : null;
        const showDay = !previous || fmtDayLabel(previous) !== fmtDayLabel(date);
        const out = m.direction === "OUT";
        return (
          <div key={m.id}>
            {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fmtDayLabel(date)}</p>}
            <div className={`flex items-end gap-2 ${out ? "justify-end" : "justify-start"}`}>
              {!out && <span className="mb-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 shadow-sm">KH</span>}
              <div className={`max-w-[88%] sm:max-w-[72%] ${out ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${out ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                  {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                  {m.attachments.map((a, ai) => {
                    if (!a.url) return null;
                    const isImage = a.type === "image" || /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(a.url);
                    return isImage ? (
                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-[18rem] overflow-hidden rounded-xl bg-white/80">
                        {/* URL ảnh do nền tảng cấp có thể hết hạn; bấm để mở bản gốc. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt="Ảnh khách gửi" className="max-h-64 w-full object-contain" loading="lazy" />
                        <span className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-brand-700"><ImageIcon className="h-3.5 w-3.5" /> Mở ảnh lớn</span>
                      </a>
                    ) : (
                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" className={`mt-1.5 flex items-center gap-1.5 text-xs underline ${out ? "text-brand-50" : "text-brand-600"}`}>
                        <FileText className="h-3.5 w-3.5" /> {a.name || "Mở tệp đính kèm"}
                      </a>
                    );
                  })}
                </div>
                <div className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] ${out ? "text-slate-400" : "text-slate-400"}`}>
                  <span>{fmtTime(date)}</span>
                  {out && m.sentByName && <span>· {m.sentByName}</span>}
                  {out && m.status === "FAILED" && <span className="font-semibold text-rose-600" title={m.errorMessage || ""}>· Gửi lỗi</span>}
                </div>
              </div>
              {out && <span className="mb-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">NV</span>}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
