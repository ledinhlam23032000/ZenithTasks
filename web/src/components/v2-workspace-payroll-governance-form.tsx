"use client";

import { useEffect } from "react";
import { CheckCircle2, Calculator, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { calculateWorkspacePayrollRunAction } from "@/lib/v2-payroll-actions";
import { approveWorkspacePayrollRunAction, previewWorkspacePayrollRunAction } from "@/lib/v2-payroll-governance-actions";

export function V2WorkspacePayrollGovernanceForm({ projectId, runId, status }: { projectId: string; runId: string; status: string }) {
  const router = useRouter();
  const [calculateState, calculateAction, calculatePending] = useFormAction(calculateWorkspacePayrollRunAction, () => router.refresh());
  const [previewState, previewAction, previewPending] = useFormAction(previewWorkspacePayrollRunAction, () => router.refresh());
  const [approveState, approveAction, approvePending] = useFormAction(approveWorkspacePayrollRunAction, () => router.refresh());
  useEffect(() => { if (calculateState.ok || previewState.ok || approveState.ok) router.refresh(); }, [approveState.ok, calculateState.ok, previewState.ok, router]);
  if (status !== "DRAFT" && status !== "PREVIEW") return null;
  return <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2">
    <div>
      <p className="text-xs leading-5 text-amber-900">Governance: CALCULATE → PREVIEW → APPROVE. Finalize/chi trả chưa có trong luồng này.</p>
      {calculateState.message && <p role="status" className="mt-2 text-xs text-emerald-700">{calculateState.message}</p>}
      {calculateState.error && <p role="alert" className="mt-2 text-xs text-rose-700">{calculateState.error}</p>}
      {previewState.message && <p role="status" className="mt-2 text-xs text-emerald-700">{previewState.message}</p>}
      {previewState.error && <p role="alert" className="mt-2 text-xs text-rose-700">{previewState.error}</p>}
      {approveState.message && <p role="status" className="mt-2 text-xs text-emerald-700">{approveState.message}</p>}
      {approveState.error && <p role="alert" className="mt-2 text-xs text-rose-700">{approveState.error}</p>}
    </div>
    {status === "DRAFT" && <div className="flex flex-wrap items-end gap-2">
      <form action={calculateAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Nhập CALCULATE<input required name="confirmation" placeholder="CALCULATE" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={calculatePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{calculatePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />} CALCULATE</button></form>
      <form action={previewAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Nhập PREVIEW<input required name="confirmation" placeholder="PREVIEW" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={previewPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{previewPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} PREVIEW</button></form>
    </div>}
    {status === "PREVIEW" && <form action={approveAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Nhập APPROVE<input required name="confirmation" placeholder="APPROVE" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={approvePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{approvePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} APPROVE</button></form>}
  </div>;
}
