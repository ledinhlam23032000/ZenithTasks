"use client";

import { useEffect } from "react";
import { CheckCircle2, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { approveWorkspacePayrollRunAction, previewWorkspacePayrollRunAction } from "@/lib/v2-payroll-governance-actions";

export function V2WorkspacePayrollGovernanceForm({ projectId, runId, status }: { projectId: string; runId: string; status: string }) {
  const router = useRouter();
  const [previewState, previewAction, previewPending] = useFormAction(previewWorkspacePayrollRunAction, () => router.refresh());
  const [approveState, approveAction, approvePending] = useFormAction(approveWorkspacePayrollRunAction, () => router.refresh());
  useEffect(() => { if (previewState.ok || approveState.ok) router.refresh(); }, [approveState.ok, previewState.ok, router]);
  if (status !== "DRAFT" && status !== "PREVIEW") return null;
  return <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-2"><div><p className="text-xs leading-5 text-amber-900">Governance: phải PREVIEW rồi APPROVE. Finalize/chi trả chưa có trong luồng này.</p>{previewState.message && <p role="status" className="mt-2 text-xs text-emerald-700">{previewState.message}</p>}{previewState.error && <p role="alert" className="mt-2 text-xs text-rose-700">{previewState.error}</p>}</div>{status === "DRAFT" && <form action={previewAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Nhập PREVIEW<input required name="confirmation" placeholder="PREVIEW" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={previewPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{previewPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} PREVIEW</button></form>}{status === "PREVIEW" && <form action={approveAction} className="flex items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="runId" value={runId} /><label className="text-xs font-medium text-slate-700">Nhập APPROVE<input required name="confirmation" placeholder="APPROVE" className="mt-1 min-h-9 rounded-lg border border-amber-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={approvePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{approvePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} APPROVE</button></form>}{approveState.message && <p role="status" className="text-xs text-emerald-700 md:col-span-2">{approveState.message}</p>}{approveState.error && <p role="alert" className="text-xs text-rose-700 md:col-span-2">{approveState.error}</p>}</div>;
}
