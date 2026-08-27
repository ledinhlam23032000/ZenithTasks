"use client";

import { Bot, Loader2, Power, Plus, ShieldCheck, UserRoundCog } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormAction } from "@/lib/use-form-action";
import { activateGlobalAiAgentAction, activateProjectAiAgentAction, createGlobalAiAgentAction, createProjectAiAgentAction, setGlobalAiAgentStatusAction, setProjectAiAgentStatusAction } from "@/lib/v2-ai-agent-actions";

function AgentFields({ global = false }: { global?: boolean }) {
  return <>
    <label className="grid gap-1 text-sm font-medium text-slate-700">Mã AI<input name="code" required minLength={3} maxLength={36} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder={global ? "executive" : "sales"} /></label>
    <label className="grid gap-1 text-sm font-medium text-slate-700">Tên hiển thị<input name="name" required minLength={2} maxLength={120} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder={global ? "AI Tổng điều hành" : "AI Kinh doanh công ty"} /></label>
    <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">System prompt và phạm vi<input name="systemPrompt" required minLength={20} maxLength={8000} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder={global ? "Chỉ aggregate toàn hệ thống, phải nêu rõ company khi đi sâu..." : "Chỉ hỗ trợ dữ liệu và nghiệp vụ của company này..."} /></label>
    <label className="grid gap-1 text-sm font-medium text-slate-700">Model tùy chọn<input name="model" maxLength={120} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" placeholder="Mặc định theo cấu hình hệ thống" /></label>
  </>;
}

export function V2ProjectAiAgentForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createProjectAiAgentAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm"><div className="flex items-center gap-2"><Bot className="h-5 w-5 text-indigo-700" /><h2 className="font-semibold text-slate-900">Tạo AI con cho company</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">AI con được gắn cố định với company này. Bản DRAFT chưa được xử lý nghiệp vụ; sau khi ACTIVE, tool vẫn phải qua scope, capability và approval.</p><form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="projectId" value={projectId} /><AgentFields /><div className="sm:col-span-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{pending ? "Đang tạo…" : "Tạo AI con ở DRAFT"}</button></div>{state.message && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{state.error}</p>}</form></section>;
}

export function V2GlobalAiAgentForm() {
  const router = useRouter();
  const [state, action, pending] = useFormAction(createGlobalAiAgentAction, () => router.refresh());
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-700" /><h2 className="font-semibold text-slate-900">Tạo AI Tổng</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">AI Tổng có quyền aggregate có giới hạn, theo dõi health/audit của AI con và phải nêu rõ company trước khi đi sâu. Không được mặc định đọc Nội Bộ.</p><form action={action} className="mt-4 grid gap-3 sm:grid-cols-2"><AgentFields global /><div className="sm:col-span-2"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}{pending ? "Đang tạo…" : "Tạo AI Tổng ở DRAFT"}</button></div>{state.message && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{state.message}</p>}{state.error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{state.error}</p>}</form></section>;
}

export function V2AiAgentStatusForm({ projectId, agentId, status }: { projectId: string; agentId: string; status: string }) {
  const router = useRouter();
  const [activateState, activateAction, activatePending] = useFormAction(activateProjectAiAgentAction, () => router.refresh());
  const [state, action, pending] = useFormAction(setProjectAiAgentStatusAction, () => router.refresh());
  useEffect(() => { if (activateState.ok || state.ok) router.refresh(); }, [activateState.ok, router, state.ok]);
  if (status === "DRAFT") return <div className="flex flex-wrap items-center gap-2"><form action={activateAction} className="flex items-center gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="agentId" value={agentId} /><input name="confirmation" required defaultValue="ACTIVATE" className="h-9 w-28 rounded-lg border border-indigo-200 bg-white px-2 text-xs" /><button type="submit" disabled={activatePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"><Power className="h-3.5 w-3.5" />Kích hoạt</button></form>{activateState.error && <span role="alert" className="text-xs text-rose-700">{activateState.error}</span>}</div>;
  if (status !== "ACTIVE") return <span className="text-xs text-slate-500">Không có thao tác nhanh ở trạng thái {status}.</span>;
  return <form action={action} className="flex flex-wrap gap-2"><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="agentId" value={agentId} /><button name="status" value="SUSPENDED" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"><Power className="h-3.5 w-3.5" />Tạm dừng</button><button name="status" value="ARCHIVED" disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"><UserRoundCog className="h-3.5 w-3.5" />Archive</button>{state.error && <span role="alert" className="text-xs text-rose-700">{state.error}</span>}</form>;
}

export function V2GlobalAiAgentStatusForm({ agentId, status }: { agentId: string; status: string }) {
  const router = useRouter();
  const [activateState, activateAction, activatePending] = useFormAction(activateGlobalAiAgentAction, () => router.refresh());
  const [statusState, statusAction, statusPending] = useFormAction(setGlobalAiAgentStatusAction, () => router.refresh());
  useEffect(() => { if (activateState.ok || statusState.ok) router.refresh(); }, [activateState.ok, router, statusState.ok]);
  return <div className="flex flex-wrap gap-2">{status === "DRAFT" && <form action={activateAction} className="flex items-center gap-2"><input type="hidden" name="agentId" value={agentId} /><input name="confirmation" required defaultValue="ACTIVATE" className="h-9 w-28 rounded-lg border border-violet-200 bg-white px-2 text-xs" /><button type="submit" disabled={activatePending} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-60"><Power className="h-3.5 w-3.5" />Kích hoạt</button></form>}{status === "ACTIVE" && <form action={statusAction} className="flex gap-2"><input type="hidden" name="agentId" value={agentId} /><button name="status" value="SUSPENDED" disabled={statusPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Tạm dừng</button><button name="status" value="ARCHIVED" disabled={statusPending} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Archive</button></form>}{activateState.error && <span role="alert" className="text-xs text-rose-700">{activateState.error}</span>}{statusState.error && <span role="alert" className="text-xs text-rose-700">{statusState.error}</span>}</div>;
}
