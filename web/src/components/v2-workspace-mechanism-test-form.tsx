"use client";

import { useEffect } from "react";
import { Bug, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { testWorkspaceMechanismAction } from "@/lib/v2-mechanism-actions";

export function V2WorkspaceMechanismTestForm({ projectId, versionId }: { projectId: string; versionId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(testWorkspaceMechanismAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="versionId" value={versionId} /><label className="text-xs font-medium text-slate-700">Nhập TEST_RULE<input name="confirmation" required placeholder="TEST_RULE" className="mt-1 min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs uppercase" /></label><button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />} {pending ? "Đang test…" : "Test rule"}</button>{state.message && <p role="status" className="w-full text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="w-full text-xs text-rose-700">{state.error}</p>}</form>;
}
