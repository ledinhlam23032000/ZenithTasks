"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { exceptionWorkspaceReconciliationAction } from "@/lib/v2-reconciliation-actions";

export function V2WorkspaceReconciliationExceptionForm({ projectId, reconciliationId }: { projectId: string; reconciliationId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(exceptionWorkspaceReconciliationAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <details className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-rose-800">Admin: đánh dấu EXCEPTION</summary><p className="mt-2 text-xs leading-5 text-rose-700">Dùng khi reference/số tiền chưa thể khớp. Không xóa bản ghi và không đánh dấu MATCHED.</p><form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="reconciliationId" value={reconciliationId} /><label className="min-w-64 flex-1 text-xs font-medium text-slate-700">Lý do<textarea name="reason" required minLength={10} className="mt-1 min-h-9 w-full rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs" /></label><label className="text-xs font-medium text-slate-700">Nhập EXCEPTION<input name="confirmation" required placeholder="EXCEPTION" className="mt-1 min-h-9 rounded-lg border border-rose-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />} {pending ? "Đang lưu…" : "Đánh dấu EXCEPTION"}</button>{state.message && <p role="status" className="w-full text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="w-full text-xs text-rose-700">{state.error}</p>}</form></details>;
}
