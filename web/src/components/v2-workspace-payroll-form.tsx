"use client";

import { useEffect } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { createWorkspacePayrollRunAction } from "@/lib/v2-payroll-actions";

export type PayrollMechanismOption = { id: string; code: string; version: number; name: string };

export function V2WorkspacePayrollForm({ projectId, mechanisms }: { projectId: string; mechanisms: PayrollMechanismOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createWorkspacePayrollRunAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <details className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900"><CalendarClock className="h-5 w-5 text-brand-600" /> Tạo PayrollRun project-local</summary><p className="mt-2 text-sm leading-6 text-slate-500">Tạo kỳ ở DRAFT và snapshot mechanism ACTIVE cùng membership hiện tại. Chưa tính, chưa thanh toán và chưa chạm bảng Lương Nội Bộ.</p><form action={action} className="mt-5 grid gap-4 md:grid-cols-2"><input type="hidden" name="projectId" value={projectId} /><label className="text-sm font-medium text-slate-700">Mã kỳ lương<input required name="code" placeholder="PAY-2026-08" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">Mechanism ACTIVE<select required name="mechanismVersionId" defaultValue="" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Chọn version</option>{mechanisms.map((item) => <option key={item.id} value={item.id}>{item.code} v{item.version} · {item.name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Từ ngày<input required type="date" name="periodStart" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">Đến ngày<input required type="date" name="periodEnd" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Ghi chú<textarea name="note" rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label><button type="submit" disabled={pending} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}{pending ? "Đang tạo…" : "Tạo DRAFT"}</button>{state.message && <p role="status" className="text-sm text-emerald-700 md:col-span-2">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700 md:col-span-2">{state.error}</p>}</form></details>;
}
