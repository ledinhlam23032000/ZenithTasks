"use client";

import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { rollbackProjectModulesAction } from "@/lib/v2-config-actions";

export type ModuleVersionOption = { version: number; status: string; note: string | null };

export function V2ModuleRollbackForm({ projectId, versions }: { projectId: string; versions: ModuleVersionOption[] }) {
  const router = useRouter();
  const [version, setVersion] = useState(String(versions.find((item) => item.status !== "ACTIVE")?.version ?? ""));
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useFormAction(rollbackProjectModulesAction, () => router.refresh());

  useEffect(() => {
    if (state.ok) {
      setConfirmation("");
      router.refresh();
    }
  }, [router, state.ok]);

  if (versions.length < 2) return null;

  return <details className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-amber-950"><History className="h-5 w-5 text-amber-700" /> Preview / khôi phục version module</summary>
    <div className="mt-4 rounded-xl border border-amber-200 bg-white/70 p-4 text-sm leading-6 text-amber-900"><strong>Không xóa lịch sử.</strong> Thao tác này tạo một version ACTIVE mới từ bản được chọn, supersede bản ACTIVE hiện tại và ghi audit. Nó chỉ đổi module hiển thị của Dự án, không xóa dữ liệu module.</div>
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="block text-sm font-medium text-slate-800">Version nguồn
        <select name="version" value={version} onChange={(event) => setVersion(event.target.value)} className="mt-1 block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm md:max-w-md">
          <option value="">Chọn version cần khôi phục</option>
          {versions.filter((item) => item.status !== "ACTIVE").map((item) => <option key={item.version} value={item.version}>Version {item.version} · {item.status}{item.note ? ` · ${item.note}` : ""}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-800">Nhập <code className="rounded bg-amber-100 px-1">ROLLBACK</code> để xác nhận
        <input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ROLLBACK" autoComplete="off" className="mt-1 block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm uppercase md:max-w-md" />
      </label>
      <button type="submit" disabled={pending || !version || confirmation.trim().toUpperCase() !== "ROLLBACK"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-100 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"><>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}</> {pending ? "Đang tạo version…" : "Preview và khôi phục"}</button>
      {state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}
      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
    </form>
  </details>;
}
