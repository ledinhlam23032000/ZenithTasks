"use client";

import { useState } from "react";
import { Check, ChevronUp, ChevronDown, Trash2, StickyNote, Plus, LoaderCircle } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/cn";
import type { PlanTaskStatusKey } from "@/lib/plans";

export type TaskRowData = {
  id: string;
  title: string;
  note: string | null;
  status: PlanTaskStatusKey;
  subtasks: TaskRowData[];
};

export type TaskRowActions = {
  onToggleDone: (id: string) => void;
  onEditTitle: (id: string, title: string) => void;
  onEditNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  /** id đang chờ máy chủ xử lý (chế độ thật) — vô hiệu hoá nút tương ứng. */
  pendingId?: string | null;
};

/**
 * Dòng hiển thị 1 nhiệm vụ (chính hoặc phụ) — component THUẦN HIỂN THỊ, dùng chung cho cả trang
 * kế hoạch thật (callback gọi server action) LẪN bản nháp AI (callback chỉ đổi state cục bộ).
 * Chỉ hỗ trợ 2 cấp: nhiệm vụ phụ không tự đệ quy thêm subtasks-của-subtasks.
 */
export function TaskRow({
  task,
  depth = 0,
  isFirst,
  isLast,
  actions,
}: {
  task: TaskRowData;
  depth?: 0 | 1;
  isFirst: boolean;
  isLast: boolean;
  actions: TaskRowActions;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [noteOpen, setNoteOpen] = useState(!!task.note);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(task.note ?? "");
  const [addingSub, setAddingSub] = useState(false);
  const [subDraft, setSubDraft] = useState("");
  const busy = actions.pendingId === task.id;
  const done = task.status === "DONE";

  function saveTitle() {
    const t = titleDraft.trim();
    if (t && t !== task.title) actions.onEditTitle(task.id, t);
    else setTitleDraft(task.title);
    setEditingTitle(false);
  }

  function saveNote() {
    actions.onEditNote(task.id, noteDraft.trim());
    setEditingNote(false);
    setNoteOpen(true);
  }

  function submitSubtask() {
    const t = subDraft.trim();
    if (t && actions.onAddSubtask) {
      actions.onAddSubtask(task.id, t);
      setSubDraft("");
    }
  }

  return (
    <div className={cn(depth === 1 && "ml-6 border-l border-slate-200 pl-4 sm:ml-8 sm:pl-5")}>
      <div className={cn("flex items-start gap-2.5 rounded-lg px-2 py-2", depth === 0 ? "hover:bg-slate-50" : "hover:bg-slate-50/70")}>
        <button
          type="button"
          onClick={() => actions.onToggleDone(task.id)}
          disabled={busy}
          aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
          className={cn(
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50",
            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-brand-400",
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
              }}
              className={cn(
                "w-full rounded-md border border-brand-300 px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20",
                depth === 0 ? "font-medium text-slate-800" : "text-slate-700",
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className={cn(
                "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-sm hover:bg-slate-100",
                depth === 0 ? "font-medium text-slate-800" : "text-slate-700",
                done && "text-slate-400 line-through",
              )}
            >
              {task.title}
            </button>
          )}

          {noteOpen && (
            <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setNoteDraft(task.note ?? ""); setEditingNote(false); }} className="text-xs text-slate-400 hover:text-slate-600">Hủy</button>
                    <button type="button" onClick={saveNote} className="text-xs font-medium text-brand-600 hover:text-brand-700">Lưu ghi chú</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditingNote(true)} className="cursor-text">
                  {task.note ? <Markdown text={task.note} className="text-slate-600" /> : <p className="text-slate-400 italic">Bấm để thêm ghi chú…</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {!noteOpen && (
            <button
              type="button"
              onClick={() => { setNoteOpen(true); if (!task.note) setEditingNote(true); }}
              title="Ghi chú"
              className={cn("rounded-md p-1.5 hover:bg-slate-100", task.note ? "text-brand-500" : "text-slate-300")}
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => actions.onMoveUp(task.id)} disabled={isFirst || busy} title="Lên" className="rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => actions.onMoveDown(task.id)} disabled={isLast || busy} title="Xuống" className="rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => actions.onDelete(task.id)} disabled={busy} title="Xóa" className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30">
            {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {task.subtasks.map((s, i) => (
        <TaskRow key={s.id} task={s} depth={1} isFirst={i === 0} isLast={i === task.subtasks.length - 1} actions={actions} />
      ))}

      {depth === 0 && actions.onAddSubtask && (
        <div className="ml-6 flex items-center gap-1.5 pl-4 pt-0.5 sm:ml-8 sm:pl-5">
          {addingSub ? (
            <input
              autoFocus
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onBlur={() => { if (!subDraft.trim()) setAddingSub(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submitSubtask(); }
                if (e.key === "Escape") { setSubDraft(""); setAddingSub(false); }
              }}
              placeholder="Tên nhiệm vụ phụ…"
              className="w-full max-w-xs rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-400"
            />
          ) : (
            <button type="button" onClick={() => setAddingSub(true)} className="inline-flex items-center gap-1 py-1 text-xs font-medium text-slate-400 hover:text-brand-600">
              <Plus className="h-3 w-3" /> Thêm nhiệm vụ phụ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
