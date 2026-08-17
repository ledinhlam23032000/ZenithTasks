"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { toggleTaskStatus } from "@/lib/plans";
import { TaskRow, type TaskRowData } from "../task-row";
import { setTaskStatus, updateTask, deleteTask, reorderTask, createSubtask, createTask, type TaskFormState } from "../actions";

function findTask(tasks: TaskRowData[], id: string): TaskRowData | undefined {
  for (const t of tasks) {
    if (t.id === id) return t;
    const sub = t.subtasks.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

/** Nối cây nhiệm vụ hiển thị (task-row.tsx) với server action thật — làm mới trang sau mỗi lần lưu. */
export function TaskTree({ planId, tasks }: { planId: string; tasks: TaskRowData[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function run(id: string, fn: () => Promise<TaskFormState | void>, successMsg?: string) {
    setPendingId(id);
    try {
      const r = await fn();
      if (r && "error" in r && r.error) {
        toast(r.error, "error");
      } else {
        if (successMsg) toast(successMsg);
        router.refresh();
      }
    } catch {
      toast("Lỗi mạng, thử lại", "error");
    } finally {
      setPendingId(null);
    }
  }

  function onToggleDone(id: string) {
    const task = findTask(tasks, id);
    if (!task) return;
    run(id, () => setTaskStatus(fd({ id, status: toggleTaskStatus(task.status) })));
  }

  function onEditTitle(id: string, title: string) {
    const task = findTask(tasks, id);
    if (!task) return;
    run(id, () => updateTask({}, fd({ id, title, note: task.note ?? "" })), "Đã lưu");
  }

  function onEditNote(id: string, note: string) {
    const task = findTask(tasks, id);
    if (!task) return;
    run(id, () => updateTask({}, fd({ id, title: task.title, note })), "Đã lưu ghi chú");
  }

  function onDelete(id: string) {
    run(id, () => deleteTask(fd({ id })));
  }

  function onMoveUp(id: string) {
    run(id, () => reorderTask(fd({ id, direction: "up" })));
  }

  function onMoveDown(id: string) {
    run(id, () => reorderTask(fd({ id, direction: "down" })));
  }

  function onAddSubtask(parentId: string, title: string) {
    run(parentId, () => createSubtask({}, fd({ parentId, title })));
  }

  async function submitNewTask() {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const r = await createTask({}, fd({ planId, title }));
      if ("error" in r && r.error) {
        toast(r.error, "error");
      } else {
        setNewTitle("");
        router.refresh();
      }
    } catch {
      toast("Lỗi mạng, thử lại", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-0.5">
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Chưa có nhiệm vụ nào — thêm nhiệm vụ đầu tiên bên dưới.</p>
      ) : (
        tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            isFirst={i === 0}
            isLast={i === tasks.length - 1}
            actions={{ onToggleDone, onEditTitle, onEditNote, onDelete, onMoveUp, onMoveDown, onAddSubtask, pendingId }}
          />
        ))
      )}

      <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2">
        <Plus className="h-4 w-4 shrink-0 text-slate-300" />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submitNewTask(); }
          }}
          disabled={creating}
          placeholder="Thêm nhiệm vụ chính…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
