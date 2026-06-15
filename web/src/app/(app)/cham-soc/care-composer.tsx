"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Send, LoaderCircle, Sparkles, X } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { CARE_CHANNEL } from "@/lib/status";
import { addCareMessage, draftCareMessage, type CareFormState } from "./actions";

const AI_PURPOSES: { key: string; label: string }[] = [
  { key: "hoi-tham", label: "Hỏi thăm sau làm" },
  { key: "nhac-tai-kham", label: "Nhắc tái khám" },
  { key: "cam-on", label: "Cảm ơn khách" },
  { key: "uu-dai", label: "Giới thiệu ưu đãi" },
];

export function CareComposer({
  customerId,
  caseId,
  aiEnabled = false,
}: {
  customerId: string;
  caseId?: string;
  aiEnabled?: boolean;
}) {
  const [state, action, pending] = useActionState<CareFormState, FormData>(addCareMessage, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState("");

  // Trạng thái cho AI soạn tin
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setContent("");
    }
  }, [state.ok, state.nonce]);

  function runAi(purpose: string) {
    setAiErr(null);
    const fd = new FormData();
    fd.append("customerId", customerId);
    fd.append("purpose", purpose);
    if (aiNote.trim()) fd.append("note", aiNote.trim());
    startAi(async () => {
      const r = await draftCareMessage({}, fd);
      if (r.error) setAiErr(r.error);
      else if (r.text) {
        setContent(r.text);
        setAiOpen(false);
      }
    });
  }

  return (
    <form ref={formRef} action={action} className="space-y-2.5">
      <input type="hidden" name="customerId" value={customerId} />
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
      <div className="flex items-center gap-2">
        <Select name="channel" defaultValue="ZALO" className="h-9 w-36">
          {Object.entries(CARE_CHANNEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select name="direction" defaultValue="OUT" className="h-9 w-40">
          <option value="OUT">Gửi tới khách</option>
          <option value="IN">Khách phản hồi</option>
        </Select>
        {aiEnabled && (
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-accent-300 bg-accent-50 px-2.5 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100"
            title="AI soạn tin gợi ý"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI soạn tin
          </button>
        )}
      </div>

      {aiOpen && aiEnabled && (
        <div className="space-y-2 rounded-xl border border-accent-200 bg-accent-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-accent-700">Chọn mục đích để AI soạn tin</span>
            <button type="button" onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AI_PURPOSES.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={aiPending}
                onClick={() => runAi(p.key)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-accent-400 hover:bg-accent-50 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input
            value={aiNote}
            onChange={(e) => setAiNote(e.target.value)}
            placeholder="Hoặc gõ ý muốn nhắn (vd: mời tái khám miễn phí tuần này)…"
            className="h-9 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={aiPending}
              onClick={() => runAi("")}
              className={buttonVariants({ size: "sm" })}
            >
              {aiPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI soạn theo ý trên
            </button>
            {aiPending && <span className="text-xs text-slate-400">Đang soạn…</span>}
          </div>
          {aiErr && <p className="text-xs text-rose-600">{aiErr}</p>}
          <p className="text-[11px] text-slate-400">AI chỉ soạn nháp — anh/chị xem &amp; sửa trước khi gửi.</p>
        </div>
      )}

      <Textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nội dung tin nhắn / ghi nhận chăm sóc…"
        required
        className="min-h-[70px]"
      />
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={buttonVariants({ size: "sm" })}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ghi nhận
        </button>
      </div>
    </form>
  );
}
