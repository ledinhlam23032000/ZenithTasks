import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, ShieldCheck } from "lucide-react";
import { V2WorkspaceSaleForm } from "@/components/v2-workspace-sale-form";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/v2-access";
import { normalizedModuleKeys } from "@/lib/v2-modules";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", PAID: "Đã thu đủ", CANCELLED: "Đã hủy" };
const statusTone: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-600", CONFIRMED: "bg-blue-50 text-blue-700", PAID: "bg-emerald-50 text-emerald-700", CANCELLED: "bg-rose-50 text-rose-700" };
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default async function ProjectSalesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProjectAccess(projectId);
  const enabled = new Set(normalizedModuleKeys(project.enabledFeatures));
  const moduleEnabled = enabled.has("sales");
  const [sales, customers] = moduleEnabled ? await Promise.all([
    prisma.zWorkspaceSale.findMany({ where: { projectId: project.id }, orderBy: { occurredAt: "desc" }, include: { customer: { select: { code: true, fullName: true } } } }),
    prisma.zWorkspaceCustomer.findMany({ where: { projectId: project.id, active: true }, select: { id: true, code: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]) : [[], []];
  const total = sales.filter((sale) => sale.status !== "CANCELLED").reduce((sum, sale) => sum + Number(sale.amount), 0);
  const collected = sales.filter((sale) => sale.status !== "CANCELLED").reduce((sum, sale) => sum + Number(sale.paidAmount), 0);
  const confirmedCount = sales.filter((sale) => sale.status === "CONFIRMED" || sale.status === "PAID").length;

  return <div className="space-y-6">
    <Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về workspace {project.name}</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-sm font-medium text-brand-600">{project.code} · Module workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Doanh số</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Doanh số của <strong>{project.name}</strong>. Các giao dịch chỉ thuộc Dự án này và không ghi vào sổ thu-chi Nội Bộ.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Scope: {project.code}</span></div></header>
    {!moduleEnabled && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Module Doanh số đang tắt trong workspace này. Admin có thể bật module tại <Link href={`/du-an/${project.id}`} className="font-semibold underline">trang workspace</Link>; thao tác bật/tắt không xóa dữ liệu.</section>}
    {moduleEnabled && <>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tổng giá trị</p><p className="mt-2 text-xl font-bold text-slate-900">{money.format(total)}</p><p className="mt-1 text-sm text-slate-500">Không tính giao dịch đã hủy</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Đã thu</p><p className="mt-2 text-xl font-bold text-emerald-700">{money.format(collected)}</p><p className="mt-1 text-sm text-slate-500">Bản ghi thu local</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Đã xác nhận/thu đủ</p><p className="mt-2 text-2xl font-bold text-slate-900">{confirmedCount}</p><p className="mt-1 text-sm text-slate-500">Trong {sales.length} giao dịch</p></div></section>
      <V2WorkspaceSaleForm projectId={project.id} customers={customers} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Giao dịch trong workspace</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{sales.length}</span></div>{sales.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có giao dịch. Ghi giao dịch đầu tiên để kiểm tra doanh số local của Dự án.</div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[52rem] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3 font-semibold">Mã</th><th className="px-3 py-3 font-semibold">Dịch vụ</th><th className="px-3 py-3 font-semibold">Khách</th><th className="px-3 py-3 font-semibold">Giá trị</th><th className="px-3 py-3 font-semibold">Đã thu</th><th className="px-3 py-3 font-semibold">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{sales.map((sale) => <tr key={sale.id}><td className="px-3 py-3 font-semibold text-slate-800">{sale.code}</td><td className="px-3 py-3 text-slate-700">{sale.serviceName}</td><td className="px-3 py-3 text-slate-600">{sale.customer ? `${sale.customer.code} · ${sale.customer.fullName}` : "Chưa liên kết"}</td><td className="px-3 py-3 text-slate-700">{money.format(Number(sale.amount))}</td><td className="px-3 py-3 text-emerald-700">{money.format(Number(sale.paidAmount))}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone[sale.status] ?? statusTone.DRAFT}`}>{statusLabel[sale.status] ?? sale.status}</span></td></tr>)}</tbody></table></div>}</section>
    </>}
  </div>;
}
