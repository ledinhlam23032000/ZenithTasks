"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, LoaderCircle, ArrowLeft, Wand2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label, Textarea, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { TaskRow, type TaskRowData } from "./task-row";
import { generatePlanDraft, createPlanFromDraft } from "./actions";
import type { PlanDraft } from "@/lib/plan-ai";

const GOAL_EXAMPLES = [
  "Chuẩn bị khai trương chi nhánh 2",
  "Tổ chức sự kiện tri ân khách hàng cuối năm",
  "Triển khai chương trình đào tạo tư vấn viên mới",
  "Chuẩn bị đợt kiểm tra an toàn phòng cháy chữa cháy quý này",
];

let nextLocalId = 0;
function genId(): string {
  return `draft-${++nextLocalId}`;
}

function draftToTasks(draft: PlanDraft): TaskRowData[] {
  return draft.tasks.map((t) => ({
    id: genId(),
    title: t.title,
    note: t.note ?? null,
    status: "TODO",
    subtasks: (t.subtasks ?? []).map((s) => ({
      id: genId(),
      title: s.title,
      note: s.note ?? null,
      status: "TODO",
      subtasks: [],
    })),
  }));
}

function mapTask(tasks: TaskRowData[], id: string, fn: (t: TaskRowData) => TaskRowData): TaskRowData[] {
  return tasks.map((t) => {
    if (t.id === id) return fn(t);
    if (t.subtasks.some((s) => s.id === id)) return { ...t, subtasks: t.subtasks.map((s) => (s.id === id ? fn(s) : s)) };
    return t;
  });
}

function removeTask(tasks: TaskRowData[], id: string): TaskRowData[] {
  return tasks.filter((t) => t.id !== id).map((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== id) }));
}

function moveTask(tasks: TaskRowData[], id: string, dir: "up" | "down"): TaskRowData[] {
  const topIdx = tasks.findIndex((t) => t.id === id);
  if (topIdx !== -1) {
    const swap = dir === "up" ? topIdx - 1 : topIdx + 1;
    if (swap < 0 || swap >= tasks.length) return tasks;
    const next = [...tasks];
    [next[topIdx], next[swap]] = [next[swap], next[topIdx]];
    return next;
  }
  return tasks.map((t) => {
    const idx = t.subtasks.findIndex((s) => s.id === id);
    if (idx === -1) return t;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= t.subtasks.length) return t;
    const nextSubs = [...t.subtasks];
    [nextSubs[idx], nextSubs[swap]] = [nextSubs[swap], nextSubs[idx]];
    return { ...t, subtasks: nextSubs };
  });
}

export function AiPlanButton({ aiOn }: { aiOn: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"goal" | "draft">("goal");
  const [goal, setGoal] = useState("");
  const [genPending, startGen] = useTransition();
  const [savePending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planNote, setPlanNote] = useState("");
  const [tasks, setTasks] = useState<TaskRowData[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const router = useRouter();
  const toast = useToast();

  function reset() {
    setStep("goal");
    setGoal("");
    setError(null);
    setPlanTitle("");
    setPlanNote("");
    setTasks([]);
    setNewTitle("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function generate() {
    const g = goal.trim();
    if (!g) return;
    setError(null);
    const fd = new FormData();
    fd.set("goal", g);
    startGen(async () => {
      const r = await generatePlanDraft({}, fd);
      if (!r.ok || !r.draft) {
        setError(r.error ?? "Không tạo được kế hoạch, vui lòng thử lại.");
        return;
      }
      setPlanTitle(r.draft.title);
      setPlanNote(r.draft.note ?? "");
      setTasks(draftToTasks(r.draft));
      setStep("draft");
    });
  }

  function addMainTask() {
    const t = newTitle.trim();
    if (!t) return;
    setTasks((prev) => [...prev, { id: genId(), title: t, note: null, status: "TODO", subtasks: [] }]);
    setNewTitle("");
  }

  function save() {
    if (!planTitle.trim() || tasks.length === 0) {
      setError("Kế hoạch cần có tên và ít nhất 1 nhiệm vụ.");
      return;
    }
    setError(null);
    const payload = {
      title: planTitle.trim(),
      note: planNote.trim() || undefined,
      tasks: tasks.map((t) => ({
        title: t.title,
        note: t.note ?? undefined,
        subtasks: t.subtasks.map((s) => ({ title: s.title, note: s.note ?? undefined })),
      })),
    };
    const fd = new FormData();
    fd.set("draft", JSON.stringify(payload));
    startSave(async () => {
      try {
        const r = await createPlanFromDraft({}, fd);
        if (r?.error) {
          setError(r.error);
          return;
        }
        toast("Đã lưu kế hoạch");
        close();
        router.refresh();
      } catch {
        toast("Lỗi mạng, thử lại", "error");
      }
    });
  }

  const actions = {
    onToggleDone: (id: string) => setTasks((prev) => mapTask(prev, id, (t) => ({ ...t, status: t.status === "DONE" ? "TODO" : "DONE" }))),
    onEditTitle: (id: string, title: string) => setTasks((prev) => mapTask(prev, id, (t) => ({ ...t, title }))),
    onEditNote: (id: string, note: string) => setTasks((prev) => mapTask(prev, id, (t) => ({ ...t, note: note || null }))),
    onDelete: (id: string) => setTasks((prev) => removeTask(prev, id)),
    onMoveUp: (id: string) => setTasks((prev) => moveTask(prev, id, "up")),
    onMoveDown: (id: string) => setTasks((prev) => moveTask(prev, id, "down")),
    onAddSubtask: (parentId: string, title: string) =>
      setTasks((prev) => mapTask(prev, parentId, (t) => ({ ...t, subtasks: [...t.subtasks, { id: genId(), title, note: null, status: "TODO", subtasks: [] }] }))),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!aiOn}
        title={aiOn ? undefined : "Chưa bật AI — vào máy chủ chạy Cai-AI-Key rồi thử lại."}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" /> Lập kế hoạch bằng AI
      </button>

      <Modal
        open={open}
        onClose={() => (!genPending && !savePending ? close() : undefined)}
        title={step === "goal" ? "Lập kế hoạch bằng AI" : "Xem & sửa bản nháp"}
        description={step === "goal" ? "Mô tả mục tiêu, AI sẽ soạn sẵn nhiệm vụ chính/phụ giúp bạn." : "Sửa thoải mái trước khi lưu — chưa có gì được lưu vào hệ thống."}
        size="lg"
      >
        {step === "goal" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ai-goal">Mục tiêu kế hoạch *</Label>
              <Textarea
                id="ai-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                autoFocus
                placeholder="VD: Chuẩn bị khai trương chi nhánh 2 vào đầu quý sau…"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-400">Gợi ý nhanh</p>
              <div className="flex flex-wrap gap-1.5">
                {GOAL_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setGoal(ex)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={close}>Hủy</Button>
              <button
                type="button"
                onClick={generate}
                disabled={genPending || !goal.trim()}
                className={buttonVariants()}
              >
                {genPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {genPending ? "Đang soạn…" : "Soạn nháp"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Badge tone="purple">
              <Sparkles className="h-3 w-3" /> Bản nháp — chưa lưu
            </Badge>
            <div>
              <Label htmlFor="ai-plan-title">Tên kế hoạch *</Label>
              <Input id="ai-plan-title" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ai-plan-note">Ghi chú tổng quan</Label>
              <Textarea id="ai-plan-note" value={planNote} onChange={(e) => setPlanNote(e.target.value)} rows={2} />
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2">
              {tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Chưa có nhiệm vụ nào.</p>
              ) : (
                tasks.map((t, i) => (
                  <TaskRow key={t.id} task={t} isFirst={i === 0} isLast={i === tasks.length - 1} actions={actions} />
                ))
              )}
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMainTask(); } }}
                  placeholder="Thêm nhiệm vụ chính…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-600/10">{error}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep("goal")}
                disabled={savePending}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Soạn lại
              </button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={close} disabled={savePending}>Hủy</Button>
                <button type="button" onClick={save} disabled={savePending} className={buttonVariants()}>
                  {savePending && <LoaderCircle className="h-4 w-4 animate-spin" />} {savePending ? "Đang lưu…" : "Lưu kế hoạch"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
