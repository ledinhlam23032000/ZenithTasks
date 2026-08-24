import Link from "next/link";
import { ArrowLeft, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/v2-access";
import { V2ProjectMemberActiveForm, V2ProjectMemberAddForm } from "@/components/v2-project-member-form";

export const dynamic = "force-dynamic";

const presetLabel: Record<string, string> = { PROJECT_ADMIN: "Project Admin", FINANCE: "Finance", INVENTORY: "Inventory", SALES: "Sales", VIEWER: "Viewer", CUSTOM: "Custom" };

export default async function ProjectMembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, project } = await requireProjectAccess(projectId);
  const memberships = await prisma.zProjectMember.findMany({ where: { projectId: project.id }, orderBy: [{ active: "desc" }, { joinedAt: "asc" }] });
  const ids = memberships.map((member) => member.userId);
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true, username: true, role: true, active: true } }) : [];
  const byId = new Map(users.map((item) => [item.id, item]));

  return <div className="space-y-6"><Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về workspace {project.name}</Link><header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Users className="h-5 w-5" /></span><div><p className="text-sm font-medium text-brand-600">{project.code} · Quản trị phạm vi</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Thành viên workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Chỉ thành viên active mới có thể mở module Dự án. Tạm dừng membership không xóa task, cơ chế hoặc lịch sử audit.</p></div></div></header>
    {user.role === "ADMIN" && <V2ProjectMemberAddForm projectId={project.id} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-slate-900">Danh sách membership</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{memberships.length}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-3 font-semibold">Nhân sự</th><th className="px-3 py-3 font-semibold">Vai trò hệ thống</th><th className="px-3 py-3 font-semibold">Preset Dự án</th><th className="px-3 py-3 font-semibold">Trạng thái</th><th className="px-3 py-3 font-semibold">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{memberships.map((member) => { const target = byId.get(member.userId); return <tr key={member.id}><td className="px-3 py-3"><p className="font-semibold text-slate-800">{target?.fullName ?? "Tài khoản không còn active"}</p><p className="text-xs text-slate-500">@{target?.username ?? member.userId}</p></td><td className="px-3 py-3 text-slate-600">{target?.role ?? "—"}</td><td className="px-3 py-3 text-slate-600">{presetLabel[member.preset] ?? member.preset}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{member.active ? "ACTIVE" : "TẠM DỪNG"}</span></td><td className="px-3 py-3">{user.role === "ADMIN" ? <V2ProjectMemberActiveForm projectId={project.id} memberId={member.id} active={member.active} /> : <span className="text-xs text-slate-400">Chỉ Admin</span>}</td></tr>; })}</tbody></table>{memberships.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có membership.</div>}</div></section>
  </div>;
}
