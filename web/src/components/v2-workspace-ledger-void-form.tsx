"use client";

import { useEffect } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { voidWorkspaceLedgerEntryAction } from "@/lib/v2-ledger-actions";

export function V2WorkspaceLedgerVoidForm({ projectId, entryId }: { projectId: string; entryId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(voidWorkspaceLedgerEntryAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <details className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-rose-800">Admin: void bản ghi</summary><form action={action} className="mt-3 space-y-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="entryId" value={entryId} /><input name="reason" required minLength={5} placeholder="Lý do void" className="min-h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs" /><input name="confirmation" required placeholder="Nhập VOID" className="min-h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs uppercase" /><button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />} {pending ? "Đang void…" : "Xác nhận void"}</button>{state.message && <p role="status" className="text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-xs text-rose-700">{state.error}</p>}</form></details>;
}
