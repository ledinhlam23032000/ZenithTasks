"use client";

import { useEffect } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { matchWorkspaceReconciliationAction } from "@/lib/v2-reconciliation-actions";

export function V2WorkspaceReconciliationMatchForm({ projectId, reconciliationId }: { projectId: string; reconciliationId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(matchWorkspaceReconciliationAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <details className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-emerald-800">Admin: xác nhận MATCHED</summary><form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="reconciliationId" value={reconciliationId} /><label className="text-xs font-medium text-slate-700">Nhập MATCH<input name="confirmation" required placeholder="MATCH" className="mt-1 min-h-9 rounded-lg border border-emerald-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />} {pending ? "Đang xác nhận…" : "Chuyển MATCHED"}</button>{state.message && <p role="status" className="w-full text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="w-full text-xs text-rose-700">{state.error}</p>}</form></details>;
}
