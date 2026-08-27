import Link from "next/link";
import { ArrowLeft, Calculator, FileCheck2 } from "lucide-react";
import { requireProjectModule } from "@/lib/v2-access";
import { projectMemberCan } from "@/lib/v2-project-capabilities";
import { prisma } from "@/lib/db";
import { V2WorkspaceMechanismForm } from "@/components/v2-workspace-mechanism-form";
import { V2WorkspaceMechanismActivateForm } from "@/components/v2-workspace-mechanism-activate-form";
import { V2WorkspaceMechanismTestForm } from "@/components/v2-workspace-mechanism-test-form";

export const dynamic = "force-dynamic";

export default async function MechanismsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, membership } = await requireProjectModule(projectId, "mechanism");
  const canManageMechanism = user.role === "ADMIN" || Boolean(membership && projectMemberCan(membership, "mechanism.manage"));
  const project = await prisma.zProject.findUnique({ where: { id: projectId }, include: { mechanisms: { orderBy: { updatedAt: "desc" }, include: { versions: { orderBy: { version: "desc" } } } } } });
  if (!project) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Không tìm thấy Dự án.</div>;
  return <div className="space-y-6"><Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về tổng quan Dự án</Link><header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Calculator className="h-5 w-5" /></span><div><p className="text-sm text-brand-600">{project.code}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Kho cơ chế</h1><p className="mt-2 text-sm text-slate-500">Mọi cơ chế có version, trạng thái và chỉ được áp dụng sau mô phỏng/phê duyệt.</p></div></div></header>{canManageMechanism && <V2WorkspaceMechanismForm projectId={project.id} />}<div className="grid gap-4">{project.mechanisms.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Chưa có cơ chế. Hãy tạo dữ liệu V2 demo từ trang Dự án.</div> : project.mechanisms.map((mechanism) => <article key={mechanism.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{mechanism.name}</h2><p className="mt-1 text-sm text-slate-500">{mechanism.code} · {mechanism.kind} · {mechanism.status}</p></div><FileCheck2 className="h-5 w-5 text-amber-600" /></div><div className="mt-4 space-y-2">{mechanism.versions.map((version) => <div key={version.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between"><span className="font-medium text-slate-700">Version {version.version}</span><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{version.status}</span></div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-500">{JSON.stringify(version.ruleSpec, null, 2)}</pre>{canManageMechanism && <V2WorkspaceMechanismTestForm projectId={project.id} versionId={version.id} />}{canManageMechanism && version.status === "DRAFT" && <V2WorkspaceMechanismActivateForm projectId={project.id} versionId={version.id} />}</div>)}</div></article>)}</div></div>;
}
