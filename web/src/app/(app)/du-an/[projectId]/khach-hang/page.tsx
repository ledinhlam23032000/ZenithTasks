import Link from "next/link";
import { ArrowLeft, ContactRound, ShieldCheck } from "lucide-react";
import { V2WorkspaceCustomerForm } from "@/components/v2-workspace-customer-form";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/v2-access";
import { normalizedModuleKeys } from "@/lib/v2-modules";

export const dynamic = "force-dynamic";

export default async function ProjectCustomersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProjectAccess(projectId);
  const enabled = new Set(normalizedModuleKeys(project.enabledFeatures));
  const moduleEnabled = enabled.has("customers");
  const customers = moduleEnabled
    ? await prisma.zWorkspaceCustomer.findMany({
        where: { projectId: project.id },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { appointments: true, sales: true } } },
      })
    : [];

  return <div className="space-y-6">
    <Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về workspace {project.name}</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-sm font-medium text-brand-600">{project.code} · Module workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Khách hàng</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Hồ sơ khách hàng của <strong>{project.name}</strong>. Đây là bảng project-local, không đọc hoặc ghi vào danh sách khách Nội Bộ.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Scope: {project.code}</span></div></header>

    {!moduleEnabled && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Module Khách hàng đang tắt trong workspace này. Admin có thể bật module tại <Link href={`/du-an/${project.id}`} className="font-semibold underline">trang workspace</Link>; thao tác bật/tắt không xóa dữ liệu.</section>}

    {moduleEnabled && <>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tổng hồ sơ</p><p className="mt-2 text-2xl font-bold text-slate-900">{customers.length}</p><p className="mt-1 text-sm text-slate-500">Chỉ thuộc Dự án này</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch hẹn liên kết</p><p className="mt-2 text-2xl font-bold text-slate-900">{customers.reduce((sum, customer) => sum + customer._count.appointments, 0)}</p><p className="mt-1 text-sm text-slate-500">Sẽ mở ở module Lịch hẹn</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Doanh số liên kết</p><p className="mt-2 text-2xl font-bold text-slate-900">{customers.reduce((sum, customer) => sum + customer._count.sales, 0)}</p><p className="mt-1 text-sm text-slate-500">Sẽ mở ở module Sales</p></div></section>
      <V2WorkspaceCustomerForm projectId={project.id} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ContactRound className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Hồ sơ trong workspace</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{customers.length}</span></div>{customers.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có hồ sơ. Tạo hồ sơ đầu tiên để kiểm tra boundary dữ liệu project-local.</div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3 font-semibold">Mã</th><th className="px-3 py-3 font-semibold">Họ tên</th><th className="px-3 py-3 font-semibold">Điện thoại</th><th className="px-3 py-3 font-semibold">Nguồn</th><th className="px-3 py-3 font-semibold">Liên kết</th><th className="px-3 py-3 font-semibold">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={customer.id}><td className="px-3 py-3 font-semibold text-slate-800"><Link href={`/du-an/${project.id}/khach-hang/${customer.id}`} className="underline decoration-slate-300 underline-offset-2 hover:text-brand-600">{customer.code}</Link></td><td className="px-3 py-3 text-slate-700">{customer.fullName}</td><td className="px-3 py-3 text-slate-600">{customer.phoneLast4 ? `•••• ${customer.phoneLast4}` : "Chưa cung cấp"}</td><td className="px-3 py-3 text-slate-600">{customer.source ?? "—"}</td><td className="px-3 py-3 text-slate-600">{customer._count.appointments} lịch · {customer._count.sales} sale</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${customer.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{customer.active ? "ACTIVE" : "TẠM DỪNG"}</span></td></tr>)}</tbody></table></div>}</section>
    </>}
  </div>;
}
