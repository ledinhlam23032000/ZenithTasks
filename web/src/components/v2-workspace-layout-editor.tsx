"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Loader2, MoveDown, MoveUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { createWorkspaceConfigProposalAction } from "@/lib/v2-config-proposal-actions";
import { V2_MODULES, type V2ModuleKey } from "@/lib/v2-modules";
import { normalizeWorkspaceLayoutOrder } from "@/lib/v2-workspace-navigation";

export function V2WorkspaceLayoutEditor({ projectId, enabledKeys, initialOrder }: { projectId: string; enabledKeys: readonly V2ModuleKey[]; initialOrder?: unknown }) {
  const router = useRouter();
  const initial = useMemo(() => {
    const enabled = enabledKeys.filter((key) => V2_MODULES.some((module) => module.key === key && module.available));
    const activeOrder = normalizeWorkspaceLayoutOrder(initialOrder, enabled);
    return [...activeOrder, ...enabled.filter((key) => !activeOrder.includes(key))];
  }, [enabledKeys, initialOrder]);
  const [order, setOrder] = useState<V2ModuleKey[]>(initial);
  const [dragging, setDragging] = useState<V2ModuleKey | null>(null);
  const [state, setState] = useState<{ ok?: boolean; message?: string; error?: string }>({});
  const [pending, start] = useTransition();

  function move(key: V2ModuleKey, delta: -1 | 1) {
    setOrder((current) => {
      const from = current.indexOf(key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function drop(target: V2ModuleKey) {
    if (!dragging || dragging === target) return;
    setOrder((current) => {
      const without = current.filter((key) => key !== dragging);
      const index = without.indexOf(target);
      without.splice(index < 0 ? without.length : index, 0, dragging);
      return without;
    });
    setDragging(null);
  }

  function createProposal() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("moduleKey", "LAYOUT");
    formData.set("riskLevel", "L2");
    formData.set("capability", "update_workspace_layout");
    formData.set("afterConfig", JSON.stringify({ order }));
    formData.set("note", "Layout tạo từ editor kéo-thả và keyboard fallback; chưa APPLY.");
    start(async () => {
      const result = await createWorkspaceConfigProposalAction({}, formData);
      setState(result);
      if (result.ok) router.refresh();
    });
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><GripVertical className="mt-0.5 h-5 w-5 text-brand-600" /><div><h2 className="font-semibold text-slate-900">Sắp xếp module của Dự án</h2><p className="mt-1 text-sm leading-6 text-slate-500">Kéo thả để xem trước thứ tự hoặc dùng nút lên/xuống khi thao tác bằng bàn phím. Bấm tạo proposal chỉ lưu bản nháp; Admin vẫn phải APPROVE rồi APPLY riêng.</p></div></div><div className="mt-4 grid gap-2" role="list" aria-label="Thứ tự module project-local">{order.map((key, index) => { const module = V2_MODULES.find((item) => item.key === key); if (!module) return null; return <div key={key} draggable onDragStart={() => setDragging(key)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(key)} role="listitem" className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${dragging === key ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50"}`}><button type="button" draggable aria-label={`Kéo module ${module.label}`} className="cursor-grab touch-none rounded-md p-1 text-slate-400 hover:bg-white hover:text-brand-600"><GripVertical className="h-4 w-4" /></button><span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{index + 1}. {module.label}</span><button type="button" onClick={() => move(key, -1)} disabled={index === 0} aria-label={`Đưa ${module.label} lên`} className="rounded-md p-1.5 text-slate-500 hover:bg-white disabled:opacity-30"><MoveUp className="h-4 w-4" /></button><button type="button" onClick={() => move(key, 1)} disabled={index === order.length - 1} aria-label={`Đưa ${module.label} xuống`} className="rounded-md p-1.5 text-slate-500 hover:bg-white disabled:opacity-30"><MoveDown className="h-4 w-4" /></button></div>; })}</div><div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900"><p className="font-semibold">Preview hiện tại</p><p className="mt-1">{order.map((key) => V2_MODULES.find((item) => item.key === key)?.label).join(" → ")}</p></div><button type="button" onClick={createProposal} disabled={pending || order.length === 0} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Tạo layout proposal DRAFT</button>{state.message && <p role="status" className="mt-2 text-xs text-emerald-700">{state.message}</p>}{state.error && <p role="alert" className="mt-2 text-xs text-rose-700">{state.error}</p>}</section>;
}
