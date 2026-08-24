"use client";

import { useFormAction } from "@/lib/use-form-action";
import { updateWorkspaceTaskStatusAction, type WorkspaceTaskActionState } from "@/lib/v2-task-actions";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function V2WorkspaceTaskStatusForm({ projectId, taskId, status }: { projectId: string; taskId: string; status: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceTaskActionState>(updateWorkspaceTaskStatusAction, () => router.refresh());

  return <form action={action} className="flex flex-wrap items-center gap-2">
    <input type="hidden" name="projectId" value={projectId} />
    <input type="hidden" name="taskId" value={taskId} />
    <label className="sr-only" htmlFor={`task-status-${taskId}`}>Trạng thái Task</label>
    <select id={`task-status-${taskId}`} name="status" defaultValue={status} disabled={pending} className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none ring-brand-500 focus:ring-2"><option value="TODO">Chưa làm</option><option value="IN_PROGRESS">Đang làm</option><option value="DONE">Hoàn thành</option></select>
    <button type="submit" disabled={pending} aria-label="Lưu trạng thái Task" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Lưu</button>
    {state.error && <span role="alert" className="text-xs text-rose-700">{state.error}</span>}
  </form>;
}
