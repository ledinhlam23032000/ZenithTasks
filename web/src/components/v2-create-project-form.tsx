"use client";

import { useEffect } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { createV2ProjectAction, PROJECT_TYPES } from "@/lib/v2-project-actions";

const TYPE_LABELS: Record<(typeof PROJECT_TYPES)[number], string> = {
  INTERNAL_CLINIC: "Nội bộ clinic",
  DISTRIBUTION: "Phân phối",
  PARTNERSHIP: "Hợp tác",
  SERVICE: "Dịch vụ",
  OTHER: "Khác",
};

export function V2CreateProjectForm() {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createV2ProjectAction, () => router.refresh());

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800">
        <FolderPlus className="h-4 w-4 text-brand-600" /> Thêm Dự án mới
      </summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Mã Dự án
          <input name="code" required minLength={3} maxLength={48} placeholder="VD: CELLARISCA-2026" className="min-h-10 rounded-lg border border-slate-200 px-3 font-mono text-sm uppercase outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          <span className="text-xs font-normal text-slate-400">Dùng chữ in hoa, số, - hoặc _.</span>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Tên Dự án
          <input name="name" required minLength={2} maxLength={120} placeholder="VD: Dự án phân phối Cellarisca" className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Loại Dự án
          <select name="projectType" defaultValue="OTHER" className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
            {PROJECT_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Mô tả (không bắt buộc)
          <textarea name="description" maxLength={500} rows={3} placeholder="Mục tiêu, phạm vi và ranh giới dữ liệu của Dự án…" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            {pending ? "Đang tạo…" : "Tạo Dự án ở trạng thái DRAFT"}
          </button>
        </div>
        {state.message && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.message}</p>}
        {state.error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{state.error}</p>}
      </form>
    </details>
  );
}
