import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/v2-access";
import { V2WorkspacePayrollForm } from "@/components/v2-workspace-payroll-form";
import { V2WorkspacePayrollGovernanceForm } from "@/components/v2-workspace-payroll-governance-form";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} VND`;
}

export default async function ProjectPayrollPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);
  const [mechanisms, runs] = await Promise.all([
    prisma.zMechanismVersion.findMany({ where: { status: "ACTIVE", definition: { projectId: project.id } }, orderBy: { effectiveFrom: "desc" }, take: 50, select: { id: true, version: true, definition: { select: { code: true, name: true } } } }),
    prisma.zWorkspacePayrollRun.findMany({ where: { projectId: project.id }, orderBy: { periodStart: "desc" }, take: 50, include: { mechanismVersion: { select: { version: true, definition: { select: { code: true, name: true } } } }, lines: { select: { id: true, userId: true, status: true, grossAmount: true, commissionAmount: true, deductionAmount: true, netAmount: true } } } }),
  ]);

  return <div className="space-y-6"><Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về tổng quan Dự án</Link><header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><CalendarClock className="h-5 w-5" /></span><div><p className="text-sm font-medium text-indigo-700">Payroll project-local · {project.code}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Kỳ lương & hoa hồng của {project.name}</h1><p className="mt-2 text-sm leading-6 text-slate-500">Chỉ đọc ZWorkspacePayrollRun/Line của Dự án. Không kết nối Attendance, PayrollEntry hay payout legacy của Nội Bộ.</p></div></div></header>{user.role === "ADMIN" && <V2WorkspacePayrollForm projectId={project.id} mechanisms={mechanisms.map((item) => ({ id: item.id, code: item.definition.code, version: item.version, name: item.definition.name }))} />}<section className="space-y-4">{runs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Chưa có PayrollRun project-local. Cần mechanism ACTIVE và membership active để tạo kỳ DRAFT.</div> : runs.map((run) => { const gross = run.lines.reduce((sum, line) => sum + Number(line.grossAmount), 0); const commission = run.lines.reduce((sum, line) => sum + Number(line.commissionAmount), 0); const net = run.lines.reduce((sum, line) => sum + Number(line.netAmount), 0); return <article key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{run.code}</h2><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">{run.status}</span></div><p className="mt-1 text-sm text-slate-500">{run.periodStart.toISOString().slice(0, 10)} → {run.periodEnd.toISOString().slice(0, 10)} · {run.lines.length} line snapshot</p><p className="mt-1 text-xs text-slate-500">Mechanism: {run.mechanismVersion?.definition.code ?? "—"} v{run.mechanismVersion?.version ?? "—"}</p></div><div className="grid grid-cols-3 gap-3 text-right text-xs"><div><p className="text-slate-500">Gross</p><p className="font-semibold text-slate-800">{money(gross)}</p></div><div><p className="text-slate-500">Commission</p><p className="font-semibold text-indigo-700">{money(commission)}</p></div><div><p className="text-slate-500">Net</p><p className="font-semibold text-slate-800">{money(net)}</p></div></div></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Kỳ hiện đang là {run.status}; snapshot line mới tạo ở mức chờ tính. Chưa có nút finalize/chi trả tự động.</p>{user.role === "ADMIN" && <V2WorkspacePayrollGovernanceForm projectId={project.id} runId={run.id} status={run.status} />}</article>; })}</section></div>;
}
