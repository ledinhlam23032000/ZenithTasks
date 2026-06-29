"use client";

import { useState, useTransition } from "react";
import { Sparkles, LoaderCircle, SendHorizontal, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SUGGESTED_QUESTIONS } from "@/lib/assistant";
import { askAssistant } from "./actions";

type Turn = { q: string; a: string };

export function AssistantChat({ aiOn }: { aiOn: boolean }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
        setTurns((t) => [{ q: text, a: r.answer as string }, ...t]);
        setQ("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {!aiOn && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/10">
          Chưa bật AI. Trên máy chủ chạy <b>Cai-AI-Key</b> (đặt nhà cung cấp + API key) rồi mở lại trang này.
        </p>
      )}

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(q);
                }
              }}
              rows={2}
              disabled={!aiOn || pending}
              placeholder="Hỏi về doanh thu, công nợ, dịch vụ bán chạy, khách rời bỏ, tồn kho…"
              className="min-h-[44px] flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={() => ask(q)}
              disabled={!aiOn || pending || !q.trim()}
              className="inline-flex h-[44px] items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />} Hỏi
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={!aiOn || pending}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}
          <p className="text-xs text-slate-400">
            ⓘ Trợ lý chỉ trả lời dựa trên số liệu tổng hợp 30 ngày gần nhất. Không gửi số điện thoại / dữ liệu y khoa cho AI. Hãy KIỂM TRA lại số liệu quan trọng.
          </p>
        </CardContent>
      </Card>

      {pending && (
        <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Đang phân tích số liệu…
        </div>
      )}

      {turns.map((t, i) => (
        <Card key={turns.length - i}>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm font-medium text-slate-700">{t.q}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{t.a}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
