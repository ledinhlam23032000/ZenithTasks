"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Sparkles, LoaderCircle, SendHorizontal, User, ClipboardList, Check } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { SUGGESTED_QUESTIONS } from "@/lib/assistant";
import { askAssistant, logAssistantChangeRequest } from "./actions";

type Turn = { q: string; a: string; loggedTaskUrl?: string };

export function AssistantChat({ aiOn, greetName }: { aiOn: boolean; greetName: string }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loggingIndex, setLoggingIndex] = useState<number | null>(null);
  const [loggingErr, setLoggingErr] = useState<{ index: number; message: string } | null>(null);
  const [logPending, startLog] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tự cuộn xuống cuối khi có tin mới / đang trả lời (effect không gọi setState).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, pending]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    setErr(null);
    const fd = new FormData();
    fd.set("question", text);
    start(async () => {
      const r = await askAssistant({}, fd);
      if (r.error) setErr(r.error);
      else if (r.answer) {
        setTurns((t) => [...t, { q: text, a: r.answer as string }]);
        setQ("");
      }
    });
  }

  // Ghi lại 1 câu hỏi/yêu cầu thành nhiệm vụ trong Lập kế hoạch — trợ lý KHÔNG
  // tự sửa hệ thống, chỉ tóm tắt + lưu để quản lý duyệt/giao lập trình sau.
  function logAsRequest(index: number) {
    const turn = turns[index];
    if (!turn || logPending) return;
    setLoggingErr(null);
    setLoggingIndex(index);
    const fd = new FormData();
    fd.set("question", turn.q);
    fd.set("answer", turn.a);
    startLog(async () => {
      const r = await logAssistantChangeRequest({}, fd);
      if (r.error) setLoggingErr({ index, message: r.error });
      else if (r.ok && r.planId) {
        setTurns((t) => t.map((x, i) => (i === index ? { ...x, loggedTaskUrl: `/ke-hoach/${r.planId}` } : x)));
      }
      setLoggingIndex(null);
    });
  }

  const empty = turns.length === 0 && !pending;

  return (
    <div className="flex h-[calc(100vh-10.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Thanh tiêu đề */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-800">Trợ lý AI</p>
          <p className="text-xs text-slate-400">Hỏi về số liệu vận hành phòng khám</p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => { setTurns([]); setErr(null); }}
            className="ml-auto rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            Cuộc trò chuyện mới
          </button>
        )}
      </div>

      {/* Khu vực tin nhắn */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {empty ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">Chào {greetName} 👋</h2>
            <p className="mt-1 text-sm text-slate-500">
              Hỏi tôi về số liệu phòng khám — doanh thu, công nợ, dịch vụ bán chạy, khách rời bỏ, tồn kho… hoặc hỏi cơ chế
              hoạt động — lương, hạng thành viên, cách tính công nợ tính như thế nào.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={!aiOn}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-sm text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {!aiOn && (
              <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/10">
                Chưa bật AI. Trên máy chủ chạy <b>Cai-AI-Key</b> rồi mở lại trang này.
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {turns.map((t, i) => (
              <div key={i} className="space-y-3">
                {/* Câu hỏi của người dùng — bong bóng phải */}
                <div className="flex justify-end">
                  <div className="flex max-w-[85%] items-start gap-2">
                    <div className="rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2 text-sm text-white shadow-sm">{t.q}</div>
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <User className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                {/* Trả lời AI — bong bóng trái + markdown */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="max-w-[85%] space-y-2">
                    <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <Markdown text={t.a} />
                    </div>
                    {t.loggedTaskUrl ? (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Check className="h-3.5 w-3.5" /> Đã ghi lại yêu cầu ·{" "}
                        <Link href={t.loggedTaskUrl} className="underline hover:text-emerald-700">
                          Xem tại Kế hoạch
                        </Link>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logAsRequest(i)}
                        disabled={logPending}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        title="Lưu câu hỏi/yêu cầu này thành 1 việc trong Kế hoạch để giao lập trình xử lý — trợ lý không tự sửa hệ thống."
                      >
                        {logPending && loggingIndex === i ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ClipboardList className="h-3.5 w-3.5" />
                        )}
                        Ghi thành yêu cầu cho lập trình
                      </button>
                    )}
                    {loggingErr?.index === i && <p className="text-xs text-rose-600">{loggingErr.message}</p>}
                  </div>
                </div>
              </div>
            ))}

            {pending && (
              <div className="mx-auto max-w-2xl">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ô nhập */}
      <div className="border-t border-slate-100 px-4 py-3">
        {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(q);
              }
            }}
            rows={1}
            disabled={!aiOn || pending}
            placeholder="Nhập câu hỏi… (Enter để gửi, Shift+Enter xuống dòng)"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => ask(q)}
            disabled={!aiOn || pending || !q.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
            title="Gửi"
          >
            {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-400">
          Trợ lý dựa trên số liệu tổng hợp 30 ngày gần nhất + quy tắc nghiệp vụ đang chạy thật · không gửi SĐT/dữ liệu y khoa
          cho AI · hãy kiểm tra lại số quan trọng · trợ lý không tự sửa hệ thống, chỉ ghi lại yêu cầu để giao lập trình.
        </p>
      </div>
    </div>
  );
}
