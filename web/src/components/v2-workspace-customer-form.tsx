"use client";

import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceCustomerAction, type WorkspaceCustomerActionState } from "@/lib/v2-customer-actions";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export function V2WorkspaceCustomerForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceCustomerActionState>(createWorkspaceCustomerAction, () => router.refresh());

  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Thêm khách vào Dự án</h2></div>
    <p className="mt-1 text-sm leading-6 text-slate-500">Hồ sơ này chỉ tồn tại trong Dự án đang mở. Không nhập số điện thoại đầy đủ; chỉ lưu 4 số cuối để tra cứu an toàn.</p>
    <input type="hidden" name="projectId" value={projectId} />
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Mã khách<span className="ml-1 text-rose-500">*</span><input required name="code" maxLength={48} placeholder="KH-0001" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm uppercase outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Họ tên<span className="ml-1 text-rose-500">*</span><input required name="fullName" maxLength={160} placeholder="Nguyễn Văn A" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">4 số cuối điện thoại<input name="phoneLast4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Nguồn khách<input name="source" maxLength={80} placeholder="Marketing, giới thiệu…" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Ghi chú<textarea name="note" maxLength={2000} rows={3} placeholder="Thông tin vận hành cần lưu ý…" className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? "Đang lưu…" : "Lưu hồ sơ khách"}</button>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>
  </form>;
}
