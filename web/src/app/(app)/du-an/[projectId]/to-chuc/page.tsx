import Link from "next/link";
import { ArrowLeft, Building2, Users } from "lucide-react";
import { requireProjectModule } from "@/lib/v2-access";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OrganizationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requireProjectModule(projectId, "organization");
  const project = await prisma.zProject.findUnique({ where: { id: projectId }, include: { units: { orderBy: { sortOrder: "asc" }, include: { positions: true } } } });
  if (!project) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Không tìm thấy Dự án.</div>;
  return <div className="space-y-6"><Link href="/du-an" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Quay lại Dự án</Link><header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Building2 className="h-5 w-5" /></span><div><p className="text-sm text-brand-600">{project.code}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Khung tổ chức</h1><p className="mt-2 text-sm text-slate-500">{project.name} · {project.units.length} bộ phận/chức năng</p></div></div></header><div className="grid gap-4">{project.units.map((unit) => <article key={unit.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">{unit.name}</h2><p className="text-xs text-slate-400">{unit.code} · {unit.type}</p></div><Users className="h-5 w-5 text-slate-400" /></div><div className="mt-4 flex flex-wrap gap-2">{unit.positions.map((position) => <span key={position.id} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{position.title}</span>)}</div></article>)}</div></div>;
}
