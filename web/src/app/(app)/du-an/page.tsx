import Link from "next/link";
import { ArrowLeft, ChevronRight, FolderKanban, Search, ShieldCheck } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2CreateProjectWizard } from "@/components/v2-create-project-wizard";
import { V2ProjectLifecycleForm } from "@/components/v2-project-lifecycle-form";
import { V2GlobalAiAgentForm, V2GlobalAiAgentStatusForm } from "@/components/v2-ai-agent-form";
import { GLOBAL_PROJECT_PAGE_SIZE, projectConsoleWhere } from "@/lib/v2-global-console-policy";
import { paginateCursorRows } from "@/lib/v2-cursor-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = GLOBAL_PROJECT_PAGE_SIZE;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ cursor?: string; q?: string }> }) {
  // Quy ước BAN-GIAO mục 6: TRANG chốt bằng requireCap("mod:<key>"), không dùng
  // requireUser([roles]). `du-an` là module có trong permissions.ts nên admin cấp/thu
  // hồi được cho từng người qua UI Phân quyền — nếu chỉ kiểm role thì việc thu hồi
  // chỉ ẩn menu, gõ thẳng URL vẫn vào được.
  const user = await requireCap("mod:du-an");
  if (process.env.ENABLE_ZENITH_V2 !== "true") return <div className="space-y-4"><header className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-medium text-brand-600">Nền tảng vận hành</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Dự án</h1><p className="mt-2 text-sm leading-6 text-slate-500">Lớp đa Dự án đang khóa để bảo toàn hệ thống clinic hiện tại. Bật <code>ENABLE_ZENITH_V2=true</code> trong môi trường test để mở.</p></header><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Chưa truy vấn bảng V2 khi feature flag tắt.</div></div>;

  const query = await searchParams;
  const search = String(query.q ?? "").trim().slice(0, 80);
  const cursor = String(query.cursor ?? "").trim().slice(0, 80) || undefined;
  const where = projectConsoleWhere(user.role, user.id, search);
  const [projects, projectCount, globalAiAgents, allUsers] = await Promise.all([
    prisma.zProject.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), take: PAGE_SIZE + 1, include: { _count: { select: { members: true, units: true, mechanisms: true, workspaceTasks: true, workspaceCustomers: true, workspaceSales: true } } } }),
    prisma.zProject.count({ where }),
    user.role === "ADMIN" ? prisma.zAiAgent.findMany({ where: { kind: "GLOBAL", projectId: null }, orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true, status: true, model: true, updatedAt: true } }) : Promise.resolve([]),
    user.role === "ADMIN" ? prisma.user.findMany({ select: { id: true, fullName: true, username: true, role: true }, orderBy: { fullName: "asc" } }) : Promise.resolve([]),
  ]);

  const page = paginateCursorRows(projects, PAGE_SIZE);
  const visibleProjects = page.items;
  const nextCursor = page.nextCursor;
  const nextHref = nextCursor ? `/du-an?${new URLSearchParams({ ...(search ? { q: search } : {}), cursor: nextCursor }).toString()}` : null;
  const baseHref = search ? `/du-an?q=${encodeURIComponent(search)}` : "/du-an";

  return <div className="space-y-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-brand-600">Nền tảng vận hành Đa Tổ Chức</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Danh Sách Công Ty & Đơn Vị</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Mỗi đơn vị là một workspace vận hành riêng biệt với hệ thống Lego Modules và AI đồng nghiệp số độc lập.
            </p>
          </div>
        </div>
      </div>
    </header>

    {user.role === "ADMIN" && <V2CreateProjectWizard users={allUsers} />}

    {user.role === "ADMIN" && <><V2GlobalAiAgentForm /><section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-700" /><h2 className="font-semibold text-slate-900">AI Tổng trong hệ thống</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-violet-700">{globalAiAgents.length}</span></div><p className="mt-2 text-sm text-slate-600">Các agent GLOBAL được giữ tách khỏi company. Chỉ AI Tổng ACTIVE mới được dùng aggregate sau khi có policy và approval phù hợp.</p>{globalAiAgents.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{globalAiAgents.map((agent) => <div key={agent.id} className="rounded-xl border border-violet-100 bg-white p-3"><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-800">{agent.name}</strong><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">{agent.status}</span></div><p className="mt-1 text-xs text-slate-500">{agent.code}{agent.model ? ` · ${agent.model}` : ""}</p><div className="mt-3"><V2GlobalAiAgentStatusForm agentId={agent.id} status={agent.status} /></div></div>)}</div>}</section></>}


    <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="min-w-64 flex-1 text-sm text-slate-700">Tìm mã hoặc tên Dự án<div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={search} placeholder="Ví dụ: PROJECT-A" className="min-h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3" /></div></label><button className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Tìm kiếm</button>{search && <Link href="/du-an" className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Xóa lọc</Link>}<span className="pb-2 text-xs text-slate-500">{projectCount} project phù hợp · tải tối đa {PAGE_SIZE}/trang · aggregate theo từng project.</span></form>

    <div className="grid gap-4">{visibleProjects.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{search ? "Không có Dự án phù hợp." : "Chưa có Dự án vận hành."}</div> : visibleProjects.map((project) => <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-slate-900">{project.name}</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{project.status}</span></div><p className="mt-1 text-sm text-slate-500">{project.code} · {project.description ?? "Chưa có mô tả"}</p><p className="mt-2 text-xs text-slate-400">{project._count.units} bộ phận · {project._count.mechanisms} cơ chế · {project._count.workspaceTasks} task · {project._count.members} thành viên · {project._count.workspaceCustomers} khách · {project._count.workspaceSales} sale</p></div><div className="flex flex-wrap gap-2">{project.status !== "ARCHIVED" && <><Link href={`/du-an/${project.id}`} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">Mở workspace</Link><Link href={`/du-an/${project.id}/to-chuc`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Tổ chức</Link><Link href={`/du-an/${project.id}/co-che`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cơ chế</Link></>}{user.role === "ADMIN" && <V2ProjectLifecycleForm projectId={project.id} projectCode={project.code} status={project.status} allowRestore />}</div></div></article>)}</div>

    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm"><span className="text-slate-500">Đang hiển thị {visibleProjects.length}/{projectCount} project trong trang hiện tại{search ? ` cho “${search}”` : ""}.</span>{nextHref ? <Link href={nextHref} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white">Trang tiếp <ChevronRight className="h-4 w-4" /></Link> : <span className="text-slate-400">Đã hết trang</span>}</div>
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"><ShieldCheck className="mt-0.5 h-5 w-5" /><p>Dữ liệu của từng Dự án được giữ trong phạm vi project riêng. Tắt module không xóa lịch sử; Manager không được truy vấn project ngoài membership active.</p></div>
    {cursor && <Link href={baseHref} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Về trang đầu</Link>}
  </div>;
}
