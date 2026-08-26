"use client";

import { useEffect } from "react";
import { Ban, CheckCircle2, Calculator, Eye, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { calculateWorkspacePayrollRunAction } from "@/lib/v2-payroll-actions";
import { approveWorkspacePayrollRunAction, finalizeWorkspacePayrollRunAction, previewWorkspacePayrollRunAction, secondApproveWorkspacePayrollRunAction, voidWorkspacePayrollRunAction } from "@/lib/v2-payroll-governance-actions";

function ConfirmationField({ name, placeholder }: { name: string; placeholder: string }) {
  return <label className="text-xs font-medium text-slate-700">Nhập {placeholder}<input required name={name} placeholder={placeholder} className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label>;
}

export function V2WorkspacePayrollGovernanceForm({ projectId, runId, status }: { projectId: string; runId: string; status: string }) {
  const router = useRouter();
  const [calculateState, calculateAction, calculatePending] = useFormAction(calculateWorkspacePayrollRunAction, () => router.refresh());
  const [previewState, previewAction, previewPending] = useFormAction(previewWorkspacePayrollRunAction, () => router.refresh());
  const [approveState, approveAction, approvePending] = useFormAction(approveWorkspacePayrollRunAction, () => router.refresh());
  const [secondState, secondAction, secondPending] = useFormAction(secondApproveWorkspacePayrollRunAction, () => router.refresh());
  const [finalizeState, finalizeAction, finalizePending] = useFormAction(finalizeWorkspacePayrollRunAction, () => router.refresh());
  const [voidState, voidAction, voidPending] = useFormAction(voidWorkspacePayrollRunAction, () => router.refresh());
  useEffect(() => { if (calculateState.ok || previewState.ok || approveState.ok || secondState.ok || finalizeState.ok || voidState.ok) router.refresh(); }, [approveState.ok, calculateState.ok, finalizeState.ok, previewState.ok, secondState.ok, voidState.ok, router]);
  if (status === "VOIDED") return null;
  return <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <p className="text-xs leading-5 text-amber-900">Governance: CALCULATE → PREVIEW → APPROVE → second approval từ Admin khác → FINALIZE. Finalize không tự tạo payout; VOID chỉ ghi trạng thái/lý do, không xóa.</p>
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">{[calculateState, previewState, approveState, secondState, finalizeState, voidState].map((state, index) => state.message ? <p key={`m-${index}`} role="status" className="text-xs text-emerald-700">{state.message}</p> : null)}{[calculateState, previewState, approveState, secondState, finalizeState, voidState].map((state, index) => state.error ? <p key={`e-${index}`} role="alert" className="text-xs text-rose-700">{state.error}</p> : null)}</div>
      {status === "DRAFT" && <div className="flex flex-wrap items-end gap-2"><form action={calculateAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><ConfirmationField name="confirmation" placeholder="CALCULATE" /><button type="submit" disabled={calculatePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{calculatePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />} CALCULATE</button></form><form action={previewAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><ConfirmationField name="confirmation" placeholder="PREVIEW" /><button type="submit" disabled={previewPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{previewPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} PREVIEW</button></form></div>}
      {status === "PREVIEW" && <form action={approveAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><ConfirmationField name="confirmation" placeholder="APPROVE" /><button type="submit" disabled={approvePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{approvePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} APPROVE</button></form>}
      {status === "APPROVED" && <div className="flex flex-wrap items-end gap-2"><form action={secondAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><ConfirmationField name="confirmation" placeholder="APPROVE_SECOND" /><button type="submit" disabled={secondPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white disabled:opacity-50">{secondPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />} SECOND</button></form><form action={finalizeAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><ConfirmationField name="confirmation" placeholder="FINALIZE" /><button type="submit" disabled={finalizePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-800 px-3 text-xs font-semibold text-white disabled:opacity-50">{finalizePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <LockKeyhole className="h-3 w-3" />} FINALIZE</button></form></div>}
      {status === "FINALIZED" && <form action={voidAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Lý do VOID<textarea required minLength={10} name="reason" className="mt-1 min-h-9 w-64 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs" /></label><ConfirmationField name="confirmation" placeholder="VOID" /><button type="submit" disabled={voidPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{voidPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} VOID</button></form>}
    </div>
  </div>;
}
