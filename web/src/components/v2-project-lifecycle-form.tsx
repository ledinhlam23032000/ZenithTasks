"use client";

import { Archive, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { setV2ProjectStatusAction, type ProjectActionState } from "@/lib/v2-project-actions";
import type { ProjectLifecycle } from "@/lib/v2-project-lifecycle";

export function V2ProjectLifecycleForm({ projectId, projectCode, status, allowRestore = false }: { projectId: string; projectCode: string; status: ProjectLifecycle; allowRestore?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(setV2ProjectStatusAction, () => router.refresh());
  const targetStatus = status === "ARCHIVED" ? "ACTIVE" : status === "DRAFT" ? "ACTIVE" : "ARCHIVED";
  const isArchive = targetStatus === "ARCHIVED";
  const isRestore = status === "ARCHIVED";

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  if (status === "ARCHIVED" && !allowRestore) return null;

  return (
    <div className="space-y-2">
      <form action={action} onSubmit={(event) => {
        if (isArchive && !window.confirm(`Lưu trữ ${projectCode}? Dữ liệu sẽ được giữ để audit/khôi phục nhưng company sẽ ngừng nhận nghiệp vụ mới.`)) event.preventDefault();
        if (isRestore && !window.confirm(`Khôi phục ${projectCode} về ACTIVE? Hãy chỉ thực hiện sau khi đã kiểm tra thành viên và cấu hình.`)) event.preventDefault();
      }} className="flex flex-wrap gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="status" value={targetStatus} />
        <input type="hidden" name="reason" value={isArchive ? "Admin chủ động lưu trữ company" : "Admin kích hoạt company sau khi cấu hình"} />
        <button type="submit" disabled={pending} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isArchive ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isArchive ? <Archive className="h-4 w-4" /> : isRestore ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {pending ? "Đang cập nhật…" : isArchive ? "Lưu trữ company" : isRestore ? "Khôi phục company" : "Kích hoạt vận hành"}
        </button>
      </form>
      {state.message && <p role="status" className="text-xs text-emerald-700">{state.message}</p>}
      {state.error && <p role="alert" className="text-xs text-rose-700">{state.error}</p>}
    </div>
  );
}
