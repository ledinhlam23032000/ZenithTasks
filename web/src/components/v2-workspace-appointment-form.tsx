"use client";

import { useFormAction } from "@/lib/use-form-action";
import { createWorkspaceAppointmentAction, type WorkspaceAppointmentActionState, updateWorkspaceAppointmentStatusAction } from "@/lib/v2-appointment-actions";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export type WorkspaceAppointmentCustomerOption = { id: string; code: string; fullName: string };
export type WorkspaceAppointmentMemberOption = { id: string; fullName: string; username: string };

export function V2WorkspaceAppointmentForm({ projectId, customers, members }: { projectId: string; customers: WorkspaceAppointmentCustomerOption[]; members: WorkspaceAppointmentMemberOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceAppointmentActionState>(createWorkspaceAppointmentAction, () => router.refresh());
  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Tạo lịch hẹn trong Dự án</h2></div>
    <p className="mt-1 text-sm leading-6 text-slate-500">Lịch hẹn chỉ liên kết khách và nhân sự thuộc <strong>workspace này</strong>; conflict được kiểm tra trong cùng Dự án.</p>
    <input type="hidden" name="projectId" value={projectId} />
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Thời gian<span className="ml-1 text-rose-500">*</span><input required type="datetime-local" name="scheduledAt" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Loại lịch<select name="type" defaultValue="NEW" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="NEW">Khách mới</option><option value="FOLLOW_UP">Tái khám</option><option value="RE_SERVICE">Dịch vụ tiếp theo</option></select></label>
      <label className="block text-sm font-medium text-slate-700">Khách local<select name="customerId" defaultValue="" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="">Chưa liên kết khách</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.code} · {customer.fullName}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700">Người phụ trách<select name="assignedToId" defaultValue="" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2"><option value="">Chưa phân công</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · @{member.username}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Dịch vụ quan tâm<input name="serviceInterest" maxLength={160} placeholder="Ví dụ: tư vấn nâng mũi…" className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
      <label className="block text-sm font-medium text-slate-700 md:col-span-2">Ghi chú<textarea name="note" maxLength={2000} rows={3} placeholder="Lưu ý vận hành…" className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2" /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? "Đang lưu…" : "Lưu lịch hẹn"}</button>{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}</div>
  </form>;
}

export function V2WorkspaceAppointmentStatusForm({ projectId, appointmentId, status }: { projectId: string; appointmentId: string; status: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction<WorkspaceAppointmentActionState>(updateWorkspaceAppointmentStatusAction, () => router.refresh());
  return <form action={action} className="flex flex-wrap items-center gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="appointmentId" value={appointmentId} /><select name="status" defaultValue={status} className="min-h-9 rounded-lg border border-slate-300 px-2 text-xs outline-none ring-brand-500 focus:ring-2"><option value="BOOKED">Đã đặt</option><option value="CONFIRMED">Đã xác nhận</option><option value="ARRIVED">Đã đến</option><option value="IN_CONSULT">Đang tư vấn</option><option value="IN_SERVICE">Đang làm</option><option value="DONE">Hoàn thành</option><option value="CANCELLED">Đã hủy</option><option value="NO_SHOW">Không đến</option></select><button type="submit" disabled={pending} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{pending ? "Đang lưu…" : "Cập nhật"}</button>{state.error && <span role="alert" className="text-xs text-rose-700">{state.error}</span>}</form>;
}
