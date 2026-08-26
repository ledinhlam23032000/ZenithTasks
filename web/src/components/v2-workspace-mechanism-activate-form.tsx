"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { activateWorkspaceMechanismAction } from "@/lib/v2-mechanism-actions";

export function V2WorkspaceMechanismActivateForm({ projectId, versionId }: { projectId: string; versionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(activateWorkspaceMechanismAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-amber-900">Preview và activate version</summary><p className="mt-2 text-xs leading-5 text-amber-800">Activate sẽ retire version ACTIVE trước đó của cùng mechanism, ghi approvedBy/approvedAt và không áp dụng sang Nội Bộ.</p><form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="versionId" value={versionId} /><label className="text-xs font-medium text-slate-700">Nhập ACTIVATE<input name="confirmation" required placeholder="ACTIVATE" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}{pending ? "Đang activate…" : "Activate version"}</button>{state.message && <p role="status" className="w-full text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="w-full text-xs text-rose-700">{state.error}</p>}</form></details>;
}
