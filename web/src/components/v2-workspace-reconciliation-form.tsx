"use client";

import { useEffect } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceReconciliationAction } from "@/lib/v2-reconciliation-actions";

export type ReconciliationOption = { id: string; code: string; label: string };

export function V2WorkspaceReconciliationForm({ projectId, sales, ledgers }: { projectId: string; sales: ReconciliationOption[]; ledgers: ReconciliationOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createWorkspaceReconciliationAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);

  return <details className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900"><ClipboardCheck className="h-5 w-5 text-brand-600" /> Ghi payment reference để đối soát</summary><p className="mt-2 text-sm leading-6 text-slate-500">Bản ghi bắt đầu ở UNMATCHED. Chỉ Admin mới chuyển sang MATCHED; dữ liệu chỉ truy cập trong Dự án hiện tại.</p><form action={action} className="mt-5 grid gap-4 md:grid-cols-2"><input type="hidden" name="projectId" value={projectId} /><label className="text-sm font-medium text-slate-700">Payment reference<input required name="paymentRef" placeholder="BANK-2026-001" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">Số tiền<input required name="amount" inputMode="numeric" placeholder="1000000" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium text-slate-700">Sale liên quan<select name="saleId" defaultValue="" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Không liên kết</option>{sales.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.label}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Ledger liên quan<select name="ledgerEntryId" defaultValue="" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Không liên kết</option>{ledgers.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.label}</option>)}</select></label><label className="text-sm font-medium text-slate-700 md:col-span-2">Ghi chú<textarea name="note" rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label><button type="submit" disabled={pending} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}{pending ? "Đang ghi…" : "Ghi UNMATCHED"}</button>{state.message && <p role="status" className="text-sm text-emerald-700 md:col-span-2">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700 md:col-span-2">{state.error}</p>}</form></details>;
}
