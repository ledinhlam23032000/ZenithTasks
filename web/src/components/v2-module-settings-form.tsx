"use client";

import { useEffect } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { updateProjectModulesAction } from "@/lib/v2-workspace-actions";
import { V2_MODULES, type V2ModuleKey } from "@/lib/v2-modules";

export function V2ModuleSettingsForm({ projectId, projectName, enabledKeys }: { projectId: string; projectName: string; enabledKeys: V2ModuleKey[] }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(updateProjectModulesAction, () => router.refresh());

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return <details className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900"><Settings2 className="h-5 w-5 text-brand-600" /> Cấu hình module cho {projectName}</summary>
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <p className="text-sm leading-6 text-slate-500">Bỏ chọn chỉ ẩn module khỏi workspace; không xóa bảng hay dữ liệu. Module “Sắp tích hợp” chỉ là danh mục định hướng và chưa thể bật bằng form này.</p>
      <div className="grid gap-3 md:grid-cols-2">{V2_MODULES.map((module) => { const checked = enabledKeys.includes(module.key); return <label key={module.key} className={`flex items-start gap-3 rounded-xl border p-3 ${module.available ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50"}`}><input type="checkbox" name="moduleKey" value={module.key} defaultChecked={checked} disabled={!module.available} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600" /><span><span className="block text-sm font-semibold text-slate-800">{module.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{module.available ? module.description : `${module.description} Chưa triển khai.`}</span></span></label>; })}</div>
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />} {pending ? "Đang lưu…" : "Lưu cấu hình module"}</button>
      {state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
    </form>
  </details>;
}
