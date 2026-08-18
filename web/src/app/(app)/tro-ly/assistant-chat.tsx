"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, LoaderCircle, SendHorizontal, User, Check, ShieldCheck, X, Download, Mic, Paperclip, ThumbsUp, ThumbsDown, Trash2, CircleDot } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { SUGGESTED_QUESTIONS } from "@/lib/assistant";
import { runAssistantAgent, confirmAssistantApproval, rejectAssistantApproval, type AgentState } from "./agent";
import { saveAssistantFeedback, uploadAssistantFile } from "./file-actions";
import { removeAssistantConversation, startNewAssistantConversation } from "./conversation-actions";

type Turn = {
  id?: string;
  q: string;
  a: string;
  exportUrl?: string;
  approval?: NonNullable<AgentState["approval"]>;
  steps?: string[];
};

type StoredAssistantMessage = {
  id: string;
  role: string;
  content: string;
  metadata?: unknown;
};

function storedMessagesToTurns(messages: readonly StoredAssistantMessage[]): Turn[] {
  const result: Turn[] = [];
  for (const message of messages) {
    if (message.role === "USER") {
      result.push({ id: message.id, q: message.content, a: "" });
      continue;
    }
    if (message.role === "ASSISTANT") {
      const last = result[result.length - 1];
      if (last && !last.a) {
        const metadata = message.metadata as { approval?: NonNullable<AgentState["approval"]>; steps?: string[] } | null | undefined;
        result[result.length - 1] = { ...last, a: message.content, approval: metadata?.approval, steps: metadata?.steps };
      } else if (last) {
        const metadata = message.metadata as { steps?: string[] } | null | undefined;
        result[result.length - 1] = { ...last, a: `${last.a}\n\n${message.content}`, approval: undefined, steps: metadata?.steps ?? last.steps };
      }
    }
  }
  return result;
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; start: () => void };

export function AssistantChat({
  aiOn,
  greetName,
  conversationId: initialConversationId,
  initialMessages,
}: {
  aiOn: boolean;
  greetName: string;
  conversationId: string;
  initialMessages: readonly StoredAssistantMessage[];
}) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => storedMessagesToTurns(initialMessages));
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [actionPending, startAction] = useTransition();
  const [actionIndex, setActionIndex] = useState<number | null>(null);
  const [filePending, startFile] = useTransition();
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    fd.set("conversationId", conversationId);
    start(async () => {
      const r = await runAssistantAgent({}, fd);
      if (r.error) setErr(r.error);
      else {
        if (r.conversationId) setConversationId(r.conversationId);
        setTurns((t) => [...t, { id: r.conversationId ?? crypto.randomUUID(), q: text, a: r.answer ?? "", approval: r.approval, steps: r.steps, exportUrl: r.exportUrl }]);
        setQ("");
      }
    });
  }

  function startVoice() {
    const browserWindow = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setErr("Trình duyệt này chưa hỗ trợ nhập giọng nói; anh có thể gõ nội dung thay thế."); return; }
    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => { const text = event.results[0]?.[0]?.transcript ?? ""; if (text) setQ((old) => `${old}${old ? " " : ""}${text}`); };
    recognition.onerror = () => setErr("Không nhận được giọng nói; anh thử lại hoặc gõ nội dung.");
    recognition.start();
  }

  function uploadFile(file: File | undefined) {
    if (!file || filePending) return;
    setFileMessage(null);
    const fd = new FormData();
    fd.set("file", file);
    startFile(async () => {
      const result = await uploadAssistantFile({}, fd);
      if (result.error) setFileMessage(result.error);
      else setFileMessage(`Đã tải ${result.file?.name ?? file.name}${result.file?.extracted ? " và trích xuất nội dung cho AI." : ". AI đã lưu file nhưng chưa trích xuất được chữ."}`);
    });
  }

  function saveFeedback(turn: Turn, kind: "APPROVAL" | "CORRECTION") {
    const fd = new FormData();
    fd.set("prompt", turn.q);
    fd.set("originalAnswer", turn.a);
    fd.set("kind", kind);
    fd.set("note", kind === "APPROVAL" ? "Admin xác nhận câu trả lời hữu ích." : "Admin đánh dấu cần rà soát; không dùng lại nguyên văn nếu chưa kiểm chứng.");
    startAction(async () => { const result = await saveAssistantFeedback({}, fd); if (result.error) setErr(result.error); else { setErr(null); if (kind === "CORRECTION") setQ(`Hãy rà soát lại câu trả lời trước cho yêu cầu: ${turn.q}`); } });
  }

  function newConversation() {
    if (actionPending) return;
    startAction(async () => {
      const result = await startNewAssistantConversation(conversationId);
      if (result.ok) {
        setConversationId(result.conversationId);
        setTurns([]);
        setQ("");
        setErr(null);
      }
    });
  }

  function deleteConversation() {
    if (actionPending) return;
    if (!window.confirm("Xóa vĩnh viễn cuộc trò chuyện này và các tin nhắn trong đó? Approval đang chờ sẽ bị hủy, dữ liệu nghiệp vụ không bị xóa.")) return;
    startAction(async () => {
      const result = await removeAssistantConversation(conversationId);
      if (!result.ok) setErr(result.error);
      else {
        setTurns([]);
        setQ("");
        setErr(null);
        router.push("/tro-ly");
        router.refresh();
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
          <div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-800">Trợ lý quản trị AI</p><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><CircleDot className="h-2.5 w-2.5" /> Sẵn sàng</span></div>
          <p className="text-xs text-slate-400">Đồng nghiệp số: phân tích, chia bước, đối chiếu và báo cáo rõ ràng</p>
        </div>
        {turns.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={newConversation} disabled={actionPending} className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50">Cuộc trò chuyện mới</button>
            <button type="button" onClick={deleteConversation} disabled={actionPending} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" title="Xóa cuộc trò chuyện"><Trash2 className="h-4 w-4" /></button>
          </div>
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
              <div key={t.id ?? i} className="space-y-3">
                <div className="flex justify-end"><div className="flex max-w-[85%] items-start gap-2"><div className="rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2 text-sm text-white shadow-sm">{t.q}</div><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500"><User className="h-4 w-4" /></span></div></div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white"><Sparkles className="h-4 w-4" /></span>
                  <div className="max-w-[90%] space-y-2">
                    <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-2.5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]"><Markdown text={t.a} /></div>
                    {t.steps && t.steps.length > 0 && <div className="flex flex-wrap gap-1.5 pl-1">{t.steps.map((step, stepIndex) => <span key={`${step}-${stepIndex}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500"><Check className="h-3 w-3 text-emerald-500" />{step}</span>)}</div>}
                    <div className="flex items-center gap-2 pl-1"><span className="text-[11px] text-slate-400">Câu trả lời này có hữu ích không?</span><button type="button" onClick={() => saveFeedback(t, "APPROVAL")} disabled={actionPending} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"><ThumbsUp className="h-3 w-3" /> Đúng</button><button type="button" onClick={() => saveFeedback(t, "CORRECTION")} disabled={actionPending} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-50"><ThumbsDown className="h-3 w-3" /> Cần sửa</button></div>
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
            {pending && <div className="mx-auto max-w-2xl"><div className="flex items-start gap-2"><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/20"><Sparkles className="h-4 w-4 animate-pulse" /></span><div className="rounded-2xl rounded-tl-sm border border-brand-100 bg-gradient-to-br from-brand-50 to-violet-50 px-4 py-3"><p className="mb-2 text-xs font-medium text-brand-700">Em đang phân tích yêu cầu và chia nhỏ các bước…</p><span className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" /></span></div></div></div>}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
        {fileMessage && <p className="mb-2 text-xs text-slate-600">{fileMessage}</p>}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(e) => uploadFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={filePending || pending || actionPending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" title="Tải file"><Paperclip className="h-5 w-5" /></button>
          <button type="button" onClick={startVoice} disabled={!aiOn || pending || actionPending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40" title="Nhập bằng giọng nói"><Mic className="h-5 w-5" /></button>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }} rows={1} disabled={!aiOn || pending || actionPending} placeholder="Hỏi AI hoặc yêu cầu đọc file… (Enter để gửi)" className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:bg-slate-50" />
          <button type="button" onClick={() => ask(q)} disabled={!aiOn || pending || actionPending || !q.trim()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40" title="Gửi">{pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}</button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-slate-400">AI chỉ dùng các thao tác được cấp phép. File được lưu tối đa 30 ngày; đọc có thể chạy ngay; sửa lương/dữ liệu luôn hiện xem trước và cần ADMIN xác nhận. Mọi thay đổi và góp ý được ghi nhật ký.</p>
      </div>
    </div>
  );
}
