"use client";

import { useFormAction } from "@/lib/use-form-action";
import { addProjectMemberAction, setProjectMemberActiveAction, type ProjectMemberActionState } from "@/lib/v2-member-actions";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function V2ProjectMemberAddForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<ProjectMemberActionState>(addProjectMemberAction, () => router.refresh());
  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Thêm người vào workspace</h2></div><p className="mt-1 text-sm leading-6 text-slate-500">Dùng username tài khoản đã có trong hệ thống. Người được thêm chỉ thấy Dự án này.</p><input type="hidden" name="projectId" value={projectId} /><div className="mt-4 grid gap-3 md:grid-cols-[1fr_14rem_auto]"><label className="block text-sm font-medium text-slate-700">Username<input required name="username" maxLength={80} placeholder="Ví dụ: manager1" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label><label className="block text-sm font-medium text-slate-700">Preset<select name="preset" defaultValue="VIEWER" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="VIEWER">Viewer</option><option value="PROJECT_ADMIN">Project Admin</option><option value="FINANCE">Finance</option><option value="INVENTORY">Inventory</option><option value="SALES">Sales</option><option value="CUSTOM">Custom</option></select></label><button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Thêm</button></div>{state.message && <p role="status" className="mt-3 text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="mt-3 text-sm text-rose-700">{state.error}</p>}</form>;
}

export function V2ProjectMemberActiveForm({ projectId, memberId, active }: { projectId: string; memberId: string; active: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<ProjectMemberActionState>(setProjectMemberActiveAction, () => router.refresh());
  return <form action={action} className="flex items-center gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="memberId" value={memberId} /><input type="hidden" name="active" value={String(!active)} /><button type="submit" disabled={pending} className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60 ${active ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{active ? "Tạm dừng" : "Kích hoạt"}</button>{state.error && <span role="alert" className="text-xs text-rose-700">{state.error}</span>}</form>;
}
