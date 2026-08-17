"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Sparkles, LoaderCircle, SendHorizontal, User, Check, ShieldCheck, X, Download } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { SUGGESTED_QUESTIONS } from "@/lib/assistant";
import { runAssistantAgent, confirmAssistantApproval, rejectAssistantApproval, type AgentState } from "./agent";

type Turn = {
  q: string;
  a: string;
  exportUrl?: string;
  approval?: NonNullable<AgentState["approval"]>;
};

export function AssistantChat({ aiOn, greetName }: { aiOn: boolean; greetName: string }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [actionPending, startAction] = useTransition();
  const [actionIndex, setActionIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, pending, actionPending]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || pending || actionPending) return;
    setErr(null);
    const fd = new FormData();
    fd.set("question", text);
    start(async () => {
      const r = await runAssistantAgent({}, fd);
      if (r.error) setErr(r.error);
      else {
        setTurns((t) => [...t, { q: text, a: r.answer ?? "", approval: r.approval, exportUrl: r.exportUrl }]);
        setQ("");
      }
    });
  }

  function resolveApproval(index: number, approve: boolean) {
    const approval = turns[index]?.approval;
    if (!approval || actionPending) return;
    setErr(null);
    setActionIndex(index);
    const fd = new FormData();
    fd.set("approvalId", approval.id);
    startAction(async () => {
      const r = await (approve ? confirmAssistantApproval({}, fd) : rejectAssistantApproval({}, fd));
      if (r.error) setErr(r.error);
      else {
        setTurns((current) => current.map((turn, i) => i === index ? { ...turn, a: `${turn.a}\n\n${r.answer ?? "Đã xử lý."}`, approval: undefined } : turn));
      }
      setActionIndex(null);
    });
  }

  const empty = turns.length === 0 && !pending;

  return (
    <div className="flex h-[calc(100vh-10.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-800">Trợ lý quản trị AI</p>
          <p className="text-xs text-slate-400">Đọc số liệu, chuẩn bị thao tác và xin xác nhận trước khi sửa</p>
        </div>
        {turns.length > 0 && (
          <button type="button" onClick={() => { setTurns([]); setErr(null); }} className="ml-auto rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            Cuộc trò chuyện mới
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {empty ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">Chào {greetName}</h2>
            <p className="mt-1 text-sm text-slate-500">Anh có thể hỏi số liệu, yêu cầu xuất file, xem lương từng người hoặc yêu cầu sửa dữ liệu. Với thao tác thay đổi, AI sẽ hiện bản xem trước để anh xác nhận.</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {["Xem lương tháng này của Lê Đình Lam", "Xuất bảng lương tháng này ra Excel", "Công nợ hiện tại bao nhiêu?", "Đổi hoa hồng tháng này của Đào Ngọc Trang thành 5 triệu"].map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} disabled={!aiOn} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-sm text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50">{s}</button>
              ))}
            </div>
            {!aiOn && <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/10">Chưa bật AI. Trên máy chủ chạy <b>Cai-AI-Key</b> rồi mở lại trang này.</p>}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {turns.map((t, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end"><div className="flex max-w-[85%] items-start gap-2"><div className="rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2 text-sm text-white shadow-sm">{t.q}</div><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"><User className="h-4 w-4" /></span></div></div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Sparkles className="h-4 w-4" /></span>
                  <div className="max-w-[90%] space-y-2">
                    <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-2.5"><Markdown text={t.a} /></div>
                    {t.exportUrl && <Link href={t.exportUrl} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"><Download className="h-3.5 w-3.5" /> Tải file đã chuẩn bị</Link>}
                    {t.approval && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                        <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-xs font-semibold text-amber-900">Xem trước thao tác — chưa thay đổi dữ liệu</p><p className="mt-1 text-sm text-amber-800">{t.approval.preview}</p><p className="mt-1 text-[11px] text-amber-700">Yêu cầu tự hết hạn sau 10 phút.</p></div></div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" disabled={actionPending} onClick={() => resolveApproval(i, true)} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50">{actionPending && actionIndex === i ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Xác nhận thực hiện</button>
                          <button type="button" disabled={actionPending} onClick={() => resolveApproval(i, false)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Hủy</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {pending && <div className="mx-auto max-w-2xl"><div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Sparkles className="h-4 w-4" /></span><div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3"><span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" /></span></div></div></div>}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }} rows={1} disabled={!aiOn || pending || actionPending} placeholder="Ví dụ: sửa hoa hồng tháng này của… (Enter để gửi)" className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50" />
          <button type="button" onClick={() => ask(q)} disabled={!aiOn || pending || actionPending || !q.trim()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40" title="Gửi">{pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}</button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-400">AI chỉ dùng các thao tác được cấp phép. Đọc có thể chạy ngay; sửa lương/dữ liệu luôn hiện xem trước và cần ADMIN xác nhận. Mọi thay đổi được ghi nhật ký.</p>
      </div>
    </div>
  );
}
