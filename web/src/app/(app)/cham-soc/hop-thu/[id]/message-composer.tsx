"use client";

import { useRef, useState, useTransition } from "react";
import { Send, LoaderCircle, Sparkles, X } from "lucide-react";
import { Input, Textarea } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { sendChannelReply, draftChannelReply } from "../actions";

const QUICK_REPLIES = [
  { label: "Chào khách mới", text: "Chào anh/chị, cảm ơn anh/chị đã quan tâm đến Trung tâm Phẫu thuật Tạo hình Thẩm mỹ Hồng Phúc. Anh/chị đang quan tâm dịch vụ nào để em hỗ trợ nhanh hơn ạ?" },
  { label: "Xin số điện thoại", text: "Anh/chị cho em xin số điện thoại hoặc 5 số cuối để em kiểm tra và tư vấn chính xác hơn ạ." },
  { label: "Mời đến tư vấn", text: "Anh/chị có thể sắp xếp thời gian đến phòng khám để bác sĩ thăm khám và tư vấn trực tiếp phù hợp với tình trạng của mình ạ." },
  { label: "Xác nhận lịch", text: "Em đã ghi nhận thông tin. Nhân viên sẽ liên hệ xác nhận lại thời gian và hướng dẫn anh/chị trước khi đến ạ." },
];

const AI_PURPOSES: { key: string; label: string }[] = [
  { key: "", label: "Trả lời tiếp câu chuyện" },
  { key: "hoi-them-thong-tin", label: "Hỏi thêm thông tin cần thiết" },
  { key: "moi-den-phong-kham", label: "Mời khách đến phòng khám tư vấn" },
  { key: "xin-loi-phan-hoi-cham", label: "Xin lỗi vì phản hồi chậm" },
];

export function MessageComposer({ conversationId, aiEnabled, disabled, disabledReason }: { conversationId: string; aiEnabled: boolean; disabled?: boolean; disabledReason?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [state, action, pending] = useFormAction(sendChannelReply, () => {
    formRef.current?.reset();
    setText("");
  });

  const [aiOpen, setAiOpen] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();

  function runAi(purpose: string) {
    setAiErr(null);
    const fd = new FormData();
    fd.append("conversationId", conversationId);
    if (purpose) fd.append("note", purpose);
    else if (aiNote.trim()) fd.append("note", aiNote.trim());
    startAi(async () => {
      const r = await draftChannelReply({}, fd);
      if (r.error) setAiErr(r.error);
      else if (r.text) {
        setText(r.text);
        setAiOpen(false);
      }
    });
  }

  if (disabled) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500">{disabledReason}</p>;
  }

  return (
    <form ref={formRef} action={action} className="space-y-2.5">
      <input type="hidden" name="conversationId" value={conversationId} />
      {aiEnabled && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-lg border border-accent-300 bg-accent-50 px-2.5 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100"
            title="AI soạn tin gợi ý"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI soạn tin
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Trả lời nhanh</span>
        <select aria-label="Chọn mẫu trả lời nhanh" defaultValue="" onChange={(event) => { const reply = QUICK_REPLIES.find((item) => item.label === event.target.value); if (reply) setText(reply.text); event.currentTarget.value = ""; }} className="h-8 min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand-500">
          <option value="">Chọn mẫu…</option>
          {QUICK_REPLIES.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
        </select>
        <span className="text-[11px] text-slate-400">Mẫu sẽ điền vào ô soạn để anh/chị chỉnh trước khi gửi.</span>
      </div>

      {aiOpen && aiEnabled && (
        <div className="space-y-2 rounded-xl border border-accent-200 bg-accent-50/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-accent-700">AI soạn theo hội thoại gần đây</span>
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
            placeholder="Hoặc gõ ý muốn nhắn…"
            className="h-9 text-sm"
          />
          <div className="flex items-center gap-2">
            <button type="button" disabled={aiPending} onClick={() => runAi(aiNote.trim())} className={buttonVariants({ size: "sm" })}>
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
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nhập tin trả lời khách…"
        required
        className="min-h-[70px]"
      />
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending || !text.trim()} className={buttonVariants({ size: "sm" })}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Gửi
        </button>
      </div>
    </form>
  );
}
