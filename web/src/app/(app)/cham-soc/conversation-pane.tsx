"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, FileText, Image as ImageIcon, LoaderCircle, MessageSquareText, Paperclip, Send, StickyNote } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFormAction } from "@/lib/use-form-action";
import {
  addInboxNote,
  assignInboxConversation,
  claimInboxConversation,
  heartbeatInboxPresence,
  retryInboxAttachment,
  retryInboxText,
  sendInboxAttachmentAction,
  sendInboxTextAction,
  setInboxStatus,
  type InboxActionResult,
} from "./inbox-actions";
import type { InboxViewModel } from "./inbox-view-model";

type Selected = NonNullable<InboxViewModel["selected"]>;
type QuickKind = "claim" | "open" | "close" | "retry-text" | "retry-file";

function QuickAction({ kind, conversationId, messageId, children }: { kind: QuickKind; conversationId: string; messageId?: string; children: React.ReactNode }) {
  const invoke = async (_previous: InboxActionResult, data: FormData) => {
    if (kind === "claim") return claimInboxConversation(data);
    if (kind === "retry-text") return retryInboxText(data);
    if (kind === "retry-file") return retryInboxAttachment(data);
    data.set("status", kind === "open" ? "OPEN" : "CLOSED");
    return setInboxStatus(data);
  };
  const [state, action, pending] = useFormAction<InboxActionResult>(invoke);
  return <form action={action} className="inline-flex">
    <input type="hidden" name="conversationId" value={conversationId} />{messageId && <input type="hidden" name="messageId" value={messageId} />}
    <button disabled={pending} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{pending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{children}</button>
    {state.error && <span className="sr-only">{state.error}</span>}
  </form>;
}

function Composer({ conversationId }: { conversationId: string }) {
  const textForm = useRef<HTMLFormElement>(null);
  const fileForm = useRef<HTMLFormElement>(null);
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  const [fileNonce, setFileNonce] = useState(() => crypto.randomUUID());
  const [textState, textAction, textPending] = useFormAction<InboxActionResult>(async (_previous, data) => sendInboxTextAction(data), () => { textForm.current?.reset(); setNonce(crypto.randomUUID()); });
  const [fileState, fileAction, filePending] = useFormAction<InboxActionResult>(async (_previous, data) => sendInboxAttachmentAction(data), () => { fileForm.current?.reset(); setFileNonce(crypto.randomUUID()); });
  const lastTypingAt = useRef(0);
  const signalTyping = () => {
    if (Date.now() - lastTypingAt.current < 2_000) return;
    lastTypingAt.current = Date.now();
    const data = new FormData(); data.set("conversationId", conversationId); data.set("isTyping", "true");
    void heartbeatInboxPresence(data).catch(() => undefined);
  };
  return <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
    <form ref={textForm} action={textAction} className="flex items-end gap-2">
      <input type="hidden" name="conversationId" value={conversationId} /><input type="hidden" name="clientNonce" value={nonce} />
      <textarea name="content" required maxLength={2000} rows={2} onChange={signalTyping} placeholder="Nhập câu trả lời cho khách…" className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
      <button aria-label="Gửi tin" disabled={textPending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">{textPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
    </form>
    {textState.error && <p className="mt-2 text-xs text-rose-600">{textState.error}</p>}
    <form ref={fileForm} action={fileAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="conversationId" value={conversationId} /><input type="hidden" name="clientNonce" value={fileNonce} />
      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-100"><Paperclip className="h-4 w-4" />Chọn ảnh/PDF<input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" /></label>
      <button disabled={filePending} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 disabled:opacity-50">{filePending ? "Đang gửi…" : "Gửi tệp"}</button>
      <span className="text-[11px] text-slate-400">JPEG, PNG, WebP, PDF · tối đa 10 MiB</span>
    </form>
    {fileState.error && <p className="mt-2 text-xs text-rose-600">{fileState.error}</p>}
  </div>;
}

function NoteForm({ conversationId }: { conversationId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useFormAction<InboxActionResult>(async (_previous, data) => addInboxNote(data), () => form.current?.reset());
  return <form ref={form} action={action} className="flex gap-2 border-t border-amber-100 bg-amber-50/70 p-3">
    <input type="hidden" name="conversationId" value={conversationId} />
    <input name="content" required maxLength={2000} placeholder="Ghi chú nội bộ (khách không nhìn thấy)…" className="h-9 min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 text-xs outline-none focus:border-amber-400" />
    <button disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-medium text-white disabled:opacity-50"><StickyNote className="h-3.5 w-3.5" />Lưu</button>
    {state.error && <span className="sr-only">{state.error}</span>}
  </form>;
}

function SnoozeForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useFormAction<InboxActionResult>(async (_previous, data) => { data.set("status", "SNOOZED"); return setInboxStatus(data); });
  return <form action={action} className="inline-flex items-center gap-1">
    <input type="hidden" name="conversationId" value={conversationId} />
    <input type="datetime-local" name="snoozedUntil" required aria-label="Tạm hoãn đến" className="h-8 w-[150px] rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-600" />
    <button disabled={pending} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 disabled:opacity-50">Tạm hoãn</button>
    {state.error && <span className="sr-only">{state.error}</span>}
  </form>;
}

export function ConversationPane({ selected, contactName, status, assigneeId, assignees, canReply, canAssign, backHref }: {
  selected: Selected;
  contactName: string;
  status: string;
  assigneeId: string | null;
  assignees: Array<{ id: string; fullName: string }>;
  canReply: boolean;
  canAssign: boolean;
  backHref: string;
}) {
  const [assignState, assignAction, assignPending] = useFormAction<InboxActionResult>(async (_previous, data) => assignInboxConversation(data));
  return <main className="flex min-h-[560px] min-w-0 flex-col bg-slate-50/40">
    <header className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2"><Link href={backHref} aria-label="Quay lại danh sách" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"><ArrowLeft className="h-4 w-4" /></Link><div className="min-w-0"><h2 className="truncate font-semibold text-slate-900">{contactName}</h2><p className="mt-0.5 text-xs text-slate-500">{selected.providerLabel}{selected.presenceLabel ? ` · ${selected.presenceLabel}` : ""}</p></div></div>
        <div className="flex flex-wrap justify-end gap-1.5">{!assigneeId && canAssign && <QuickAction kind="claim" conversationId={selected.id}>Nhận xử lý</QuickAction>}{status !== "OPEN" && canAssign && <QuickAction kind="open" conversationId={selected.id}>Mở lại</QuickAction>}{status === "OPEN" && canAssign && <SnoozeForm conversationId={selected.id} />}{status !== "CLOSED" && canAssign && <QuickAction kind="close" conversationId={selected.id}>Đóng</QuickAction>}</div>
      </div>
      {canAssign && <form action={assignAction} className="mt-3 flex max-w-sm items-center gap-2"><input type="hidden" name="conversationId" value={selected.id} /><select name="assigneeId" defaultValue={assigneeId ?? ""} required className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">Phân công nhân viên…</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select><button disabled={assignPending} className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-medium">Giao</button>{assignState.error && <span className="text-xs text-rose-600">{assignState.error}</span>}</form>}
    </header>
    <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
      {selected.messages.length === 0 ? <div className="py-20 text-center text-sm text-slate-500"><MessageSquareText className="mx-auto mb-3 h-8 w-8 text-slate-300" />Chưa có nội dung trong hội thoại.</div> : selected.messages.map((message) => <article key={message.id} className={cn("flex", message.direction === "OUT" ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[72%]", message.direction === "OUT" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800")}>
          {message.type === "IMAGE" && <ImageIcon className="mb-1 h-4 w-4 opacity-70" />}{message.type === "FILE" && <FileText className="mb-1 h-4 w-4 opacity-70" />}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.attachmentIds.map((id) => <a key={id} href={`/api/channels/attachments/${id}`} target="_blank" rel="noreferrer" className={cn("mt-2 block text-xs underline", message.direction === "OUT" ? "text-white/90" : "text-brand-700")}>Mở tệp đính kèm</a>)}
          <div className={cn("mt-1.5 flex items-center justify-end gap-2 text-[10px]", message.direction === "OUT" ? "text-white/70" : "text-slate-400")}><time>{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time>{message.direction === "OUT" && <span>{message.statusLabel}</span>}</div>
          {message.errorLabel && <div className="mt-2 rounded-lg bg-white/95 p-2 text-xs text-rose-700"><p>{message.errorLabel}</p><div className="mt-2"><QuickAction kind={message.type === "TEXT" ? "retry-text" : "retry-file"} conversationId={selected.id} messageId={message.id}>Thử lại</QuickAction></div></div>}
        </div>
      </article>)}
    </div>
    {canReply && status !== "CLOSED" && <><NoteForm conversationId={selected.id} /><Composer conversationId={selected.id} /></>}
  </main>;
}
