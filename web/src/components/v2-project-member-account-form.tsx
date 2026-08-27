"use client";

import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { createProjectMemberAccountAction } from "@/lib/v2-member-actions";

const presets = [
  ["VIEWER", "Viewer — chỉ xem"],
  ["SALES", "Sales — khách, lịch hẹn, doanh số"],
  ["FINANCE", "Finance — tài chính, payroll"],
  ["INVENTORY", "Inventory — tổ chức, cơ chế"],
  ["PROJECT_ADMIN", "Project Admin — quản trị company"],
  ["CUSTOM", "Custom — cấp capability riêng sau"],
] as const;

export function V2ProjectMemberAccountForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createProjectMemberAccountAction, () => router.refresh());

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <details className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-900">
        <UserPlus className="h-4 w-4 text-brand-700" /> Tạo tài khoản nhân viên cho company này
      </summary>
      <p className="mt-2 text-xs leading-5 text-slate-600">Account được tạo ở identity hệ thống nhưng chỉ được gán vào company này. Mật khẩu khởi tạo không lưu vào audit và nhân viên phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="projectId" value={projectId} />
        <label className="grid gap-1 text-sm font-medium text-slate-700">Họ tên<input name="fullName" required minLength={2} maxLength={160} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Nguyễn Văn A" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Username<input name="username" required minLength={3} maxLength={80} pattern="[a-z0-9][a-z0-9._-]{2,79}" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="nguyen.van.a" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-1">Mật khẩu khởi tạo <KeyRound className="h-3.5 w-3.5" /></span><input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Ít nhất 8 ký tự" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Preset company<select name="preset" defaultValue="VIEWER" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">{presets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="sm:col-span-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{pending ? "Đang tạo…" : "Tạo account và gán vào company"}</button></div>
        {state.message && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.message}</p>}
        {state.error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{state.error}</p>}
      </form>
    </details>
  );
}
