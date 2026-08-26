"use client";

import { useEffect } from "react";
import { BookPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceLedgerEntryAction } from "@/lib/v2-ledger-actions";

export type LedgerSaleOption = { id: string; code: string; serviceName: string; amount: string };

export function V2WorkspaceLedgerForm({ projectId, sales }: { projectId: string; sales: LedgerSaleOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createWorkspaceLedgerEntryAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);

  return <details open className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900"><BookPlus className="h-5 w-5 text-brand-600" /> Ghi khoản thu/chi project-local</summary>
    <p className="mt-2 text-sm leading-6 text-slate-500">Bản ghi chỉ thuộc Dự án hiện tại. Không sửa hoặc xóa bảng Thu-Chi Nội Bộ; nếu nhập sai, Admin dùng void để giữ lịch sử.</p>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="text-sm font-medium text-slate-700">Mã ledger<input required name="code" placeholder="THU-001" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Hướng<select name="direction" defaultValue="INCOME" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="INCOME">Khoản thu</option><option value="EXPENSE">Khoản chi</option></select></label>
      <label className="text-sm font-medium text-slate-700">Nhóm<input required name="category" placeholder="SALE / VẬN HÀNH" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Số tiền (VND)<input required name="amount" inputMode="numeric" placeholder="1000000" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Liên kết doanh số (không bắt buộc)<select name="saleId" defaultValue="" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="">Không liên kết</option>{sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.code} · {sale.serviceName} · {sale.amount} VND</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Mã tham chiếu<input name="sourceRef" placeholder="Phiếu / giao dịch nội bộ của project" className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700 md:col-span-2">Mô tả<textarea name="description" rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
      <button type="submit" disabled={pending} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookPlus className="h-4 w-4" />}{pending ? "Đang ghi…" : "Ghi ledger"}</button>
      {state.message && <p role="status" className="text-sm text-emerald-700 md:col-span-2">{state.message}</p>}
      {state.error && <p role="alert" className="text-sm text-rose-700 md:col-span-2">{state.error}</p>}
    </form>
  </details>;
}
