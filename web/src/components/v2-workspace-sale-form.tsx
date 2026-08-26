"use client";

import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceSaleAction, type WorkspaceSaleActionState } from "@/lib/v2-sale-actions";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export type WorkspaceSaleCustomerOption = { id: string; code: string; fullName: string };

export function V2WorkspaceSaleForm({ projectId, customers }: { projectId: string; customers: WorkspaceSaleCustomerOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceSaleActionState>(createWorkspaceSaleAction, () => router.refresh());
  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Ghi doanh số trong Dự án</h2></div>
    <p className="mt-1 text-sm leading-6 text-slate-500">Giao dịch này là bản ghi project-local. Không ghi vào CaseRecord, Payment hoặc sổ thu-chi Nội Bộ.</p>
    <input type="hidden" name="projectId" value={projectId} />
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Mã giao dịch<span className="ml-1 text-rose-500">*</span><input required name="code" maxLength={48} placeholder="SALE-0001" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Dịch vụ<span className="ml-1 text-rose-500">*</span><input required name="serviceName" maxLength={160} placeholder="Gói dịch vụ A" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Tổng giá trị (VND)<span className="ml-1 text-rose-500">*</span><input required name="amount" inputMode="numeric" placeholder="10000000" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Đã thu (VND)<input name="paidAmount" inputMode="numeric" placeholder="0" defaultValue="0" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Trạng thái<select name="status" defaultValue="DRAFT" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="DRAFT">Nháp</option><option value="CONFIRMED">Đã xác nhận</option><option value="PAID">Đã thu đủ</option><option value="CANCELLED">Đã hủy</option></select></label>
      <label className="block text-sm font-medium text-slate-700">Khách local<select name="customerId" defaultValue="" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="">Chưa liên kết khách</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.fullName}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Ghi chú<textarea name="note" maxLength={2000} rows={3} placeholder="Ghi chú giao dịch…" className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? "Đang lưu…" : "Ghi doanh số"}</button>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>
  </form>;
}
