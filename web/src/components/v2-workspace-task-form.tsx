"use client";

import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceTaskAction, type WorkspaceTaskActionState } from "@/lib/v2-task-actions";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export type TaskMemberOption = { id: string; fullName: string; username: string };

export function V2WorkspaceTaskForm({ projectId, members }: { projectId: string; members: TaskMemberOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceTaskActionState>(createWorkspaceTaskAction, () => router.refresh());

  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><Plus className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Tạo Task trong workspace</h2></div>
    <p className="mt-1 text-sm leading-6 text-slate-500">Task này chỉ thuộc Dự án đang mở, không xuất hiện trong Nội Bộ hay Dự án khác.</p>
    <input type="hidden" name="projectId" value={projectId} />
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Tên Task<span className="ml-1 text-rose-500">*</span><input required name="title" maxLength={160} placeholder="Ví dụ: Chuẩn hóa quy trình tiếp nhận" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Mô tả<textarea name="description" maxLength={5000} rows={3} placeholder="Mục tiêu, đầu ra hoặc lưu ý…" className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Ưu tiên<select name="priority" defaultValue="NORMAL" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="LOW">Thấp</option><option value="NORMAL">Bình thường</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn</option></select></label>
      <label className="block text-sm font-medium text-slate-700">Hạn hoàn thành<input type="date" name="dueDate" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Người phụ trách<select name="assigneeId" defaultValue="" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="">Chưa phân công</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · @{member.username}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? "Đang tạo…" : "Tạo Task"}</button>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>
  </form>;
}
