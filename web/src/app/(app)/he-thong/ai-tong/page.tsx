import { Activity, Bot, ClipboardList, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { DRAFT: "Nháp", ACTIVE: "Đang hoạt động", SUSPENDED: "Tạm dừng", ARCHIVED: "Đã lưu trữ" };

function healthLabel(status: string, lastHeartbeatAt: Date | null) {
  if (status !== "ACTIVE") return "Không chạy";
  if (!lastHeartbeatAt) return "Chưa có heartbeat";
  const ageMs = Date.now() - lastHeartbeatAt.getTime();
  return ageMs > 5 * 60 * 1000 ? "Heartbeat cũ" : "Khỏe";
}

function healthClass(label: string) {
  if (label === "Khỏe") return "bg-emerald-100 text-emerald-800";
  if (label === "Chưa có heartbeat") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export default async function GlobalAiObservabilityPage() {
  await requireUser(["ADMIN"]);
  const [agents, auditEntries] = await Promise.all([
    prisma.zAiAgent.findMany({
      orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
      select: { id: true, code: true, name: true, kind: true, status: true, projectId: true, project: { select: { code: true, name: true } }, model: true, toolAllowlist: true, lastHeartbeatAt: true, updatedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { entity: "ZAiAgent" },
      orderBy: { at: "desc" },
      take: 25,
      select: { id: true, action: true, entityId: true, meta: true, at: true, actor: { select: { username: true, fullName: true } } },
    }),
  ]);
  const activeChildren = agents.filter((agent) => agent.kind === "CHILD" && agent.status === "ACTIVE");
  const activeGlobals = agents.filter((agent) => agent.kind === "GLOBAL" && agent.status === "ACTIVE");
  const staleOrMissingHeartbeat = activeChildren.filter((agent) => healthLabel(agent.status, agent.lastHeartbeatAt) !== "Khỏe").length;

  return <div className="space-y-6">
    <header className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Bot className="h-5 w-5" /></span><div><p className="text-sm font-medium text-violet-700">Control plane · Global Admin</p><h1 className="mt-1 text-2xl font-bold text-slate-900">AI Tổng · health, policy và audit</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Màn hình này chỉ hiển thị trạng thái và aggregate summary. AI Tổng không được dùng trang này để đọc raw tenant data, sửa quyền, bỏ qua approval hoặc gọi tool ngoài allowlist.</p></div></div>
    </header>

    <div className="grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><Bot className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{agents.length}</p><p className="text-sm text-slate-500">Tổng agent</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><ShieldCheck className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{activeChildren.length}</p><p className="text-sm text-slate-500">Child ACTIVE</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><Activity className="h-5 w-5 text-amber-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{staleOrMissingHeartbeat}</p><p className="text-sm text-slate-500">Child thiếu heartbeat</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><Bot className="h-5 w-5 text-indigo-600" /><p className="mt-3 text-2xl font-bold text-slate-900">{activeGlobals.length}</p><p className="text-sm text-slate-500">Global ACTIVE</p></div>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-violet-600" /><h2 className="font-semibold text-slate-900">Agent health và scope</h2></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Agent</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Health</th><th className="px-3 py-2">Tools</th><th className="px-3 py-2">Heartbeat</th></tr></thead><tbody className="divide-y divide-slate-100">{agents.map((agent) => { const health = healthLabel(agent.status, agent.lastHeartbeatAt); const tools = Array.isArray(agent.toolAllowlist) ? agent.toolAllowlist.map(String).join(", ") : "—"; return <tr key={agent.id}><td className="px-3 py-3"><p className="font-semibold text-slate-800">{agent.name}</p><p className="text-xs text-slate-500">{agent.code}{agent.model ? ` · ${agent.model}` : ""}</p></td><td className="px-3 py-3">{agent.kind === "GLOBAL" ? <span className="font-medium text-indigo-700">GLOBAL · aggregate</span> : <span>{agent.project?.code ?? "project missing"}</span>}</td><td className="px-3 py-3">{statusLabel[agent.status] ?? agent.status}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthClass(health)}`}>{health}</span></td><td className="max-w-[280px] px-3 py-3 text-xs text-slate-600">{tools}</td><td className="px-3 py-3 text-xs text-slate-500">{agent.lastHeartbeatAt ? agent.lastHeartbeatAt.toISOString() : "Chưa ghi nhận"}</td></tr>; })}</tbody></table></div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold text-slate-900">Audit lifecycle gần đây</h2></div>
      <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị action, actor và metadata tối thiểu của agent; không hiển thị prompt, raw customer data hoặc payload nghiệp vụ.</p>
      <div className="mt-4 space-y-2">{auditEntries.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">Chưa có audit lifecycle.</p> : auditEntries.map((entry) => <article key={entry.id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-col justify-between gap-1 md:flex-row"><p className="font-medium text-slate-800">{entry.action}</p><time className="text-xs text-slate-500">{entry.at.toISOString()}</time></div><p className="mt-1 text-xs text-slate-500">Actor: {entry.actor?.fullName ?? entry.actor?.username ?? "system"} · Agent ID: {entry.entityId ?? "—"}</p></article>)}</div>
    </section>
  </div>;
}
