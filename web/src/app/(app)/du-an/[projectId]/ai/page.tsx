import Link from "next/link";
import { ArrowLeft, Bot, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProjectCapability } from "@/lib/v2-access";
import { V2AiAgentStatusForm, V2ProjectAiAgentForm } from "@/components/v2-ai-agent-form";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { DRAFT: "Nháp", ACTIVE: "Đang hoạt động", SUSPENDED: "Tạm dừng", ARCHIVED: "Đã lưu trữ" };

export default async function ProjectAiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProjectCapability(projectId, "config.manage");
  const agents = await prisma.zAiAgent.findMany({ where: { projectId: project.id, kind: "CHILD" }, orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true, status: true, model: true, systemPrompt: true, toolAllowlist: true, updatedAt: true } });
  return <div className="space-y-6">
    <Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về workspace {project.name}</Link>
    <header className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-medium text-indigo-700">AI con · {project.code}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">AI riêng của {project.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Mỗi company có agent riêng. AI con chỉ được hoạt động với context company này; mọi tool vẫn qua capability, audit và approval.</p></div></div></header>
    <V2ProjectAiAgentForm projectId={project.id} />
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">Danh sách AI con</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{agents.length}</span></div><div className="mt-4 grid gap-3">{agents.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có AI con. Hãy tạo agent DRAFT, kiểm tra scope rồi mới kích hoạt.</div> : agents.map((agent) => <article key={agent.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{agent.name}</h3><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">{statusLabel[agent.status] ?? agent.status}</span></div><p className="mt-1 text-xs text-slate-500">{agent.code}{agent.model ? ` · ${agent.model}` : ""}</p><p className="mt-2 text-sm leading-6 text-slate-600">{agent.systemPrompt}</p><p className="mt-2 text-xs text-slate-500">Tool allowlist hiện tại: {Array.isArray(agent.toolAllowlist) && agent.toolAllowlist.length > 0 ? agent.toolAllowlist.map(String).join(", ") : "chưa cấp tool"}</p></div><V2AiAgentStatusForm projectId={project.id} agentId={agent.id} status={agent.status} /></div></article>)}</div></section>
  </div>;
}
