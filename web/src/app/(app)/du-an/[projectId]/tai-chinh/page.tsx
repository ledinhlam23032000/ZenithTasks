import Link from "next/link";
import { ArrowLeft, BookOpen, CircleDollarSign } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/v2-access";
import { V2WorkspaceLedgerForm } from "@/components/v2-workspace-ledger-form";
import { V2WorkspaceLedgerVoidForm } from "@/components/v2-workspace-ledger-void-form";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} VND`;
}

export default async function ProjectFinancePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);
  const [entries, sales, income, expense] = await Promise.all([
    prisma.zWorkspaceLedgerEntry.findMany({ where: { projectId: project.id }, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 100, select: { id: true, code: true, direction: true, status: true, category: true, description: true, amount: true, occurredAt: true, sourceRef: true, sale: { select: { code: true, serviceName: true } } } }),
    prisma.zWorkspaceSale.findMany({ where: { projectId: project.id, status: { not: "CANCELLED" } }, orderBy: { occurredAt: "desc" }, take: 100, select: { id: true, code: true, serviceName: true, amount: true } }),
    prisma.zWorkspaceLedgerEntry.aggregate({ where: { projectId: project.id, direction: "INCOME", status: "POSTED" }, _sum: { amount: true } }),
    prisma.zWorkspaceLedgerEntry.aggregate({ where: { projectId: project.id, direction: "EXPENSE", status: "POSTED" }, _sum: { amount: true } }),
  ]);

  return <div className="space-y-6">
    <Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về tổng quan Dự án</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CircleDollarSign className="h-5 w-5" /></span><div><p className="text-sm font-medium text-emerald-700">Tài chính project-local · {project.code}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Sổ thu/chi của {project.name}</h1><p className="mt-2 text-sm leading-6 text-slate-500">Chỉ đọc ZWorkspaceLedgerEntry thuộc Dự án này. Không kết nối với Thu-Chi, Payment hoặc Finance legacy của Nội Bộ.</p></div></div></header>
    <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tổng khoản thu</p><p className="mt-2 text-2xl font-bold text-emerald-900">{money(income._sum.amount)}</p></div><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Tổng khoản chi</p><p className="mt-2 text-2xl font-bold text-rose-900">{money(expense._sum.amount)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số bản ghi</p><p className="mt-2 text-2xl font-bold text-slate-900">{entries.length}</p><p className="mt-1 text-sm text-slate-500">Hiển thị tối đa 100 bản ghi gần nhất</p></div></section>
    <V2WorkspaceLedgerForm projectId={project.id} sales={sales.map((sale) => ({ id: sale.id, code: sale.code, serviceName: sale.serviceName, amount: sale.amount.toString() }))} />
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-slate-700" /><h2 className="font-semibold text-slate-900">Ledger project-local</h2></div>{entries.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có bản ghi thu/chi. Hãy tạo nghiệp vụ đầu tiên của Dự án.</p> : <div className="mt-4 space-y-3">{entries.map((entry) => <article key={entry.id} className={`rounded-xl border p-4 ${entry.status === "VOIDED" ? "border-slate-200 bg-slate-50 opacity-75" : "border-slate-200"}`}><div className="flex flex-col justify-between gap-2 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{entry.code}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.direction === "INCOME" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{entry.direction === "INCOME" ? "THU" : "CHI"}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{entry.status}</span></div><p className="mt-1 text-sm text-slate-600">{entry.category}{entry.description ? ` · ${entry.description}` : ""}</p>{entry.sale && <p className="mt-1 text-xs text-slate-500">Sale: {entry.sale.code} · {entry.sale.serviceName}</p>}{entry.sourceRef && <p className="mt-1 text-xs text-slate-500">Ref: {entry.sourceRef}</p>}</div><div className={`text-lg font-bold ${entry.direction === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>{money(entry.amount)}</div></div>{user.role === "ADMIN" && entry.status === "POSTED" && <V2WorkspaceLedgerVoidForm projectId={project.id} entryId={entry.id} />}</article>)}</div>}</section>
  </div>;
}
