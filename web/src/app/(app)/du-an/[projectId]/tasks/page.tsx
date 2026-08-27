import Link from "next/link";
import { CalendarClock, CheckCircle2, ListTodo, ShieldCheck, UserRound } from "lucide-react";
import { V2WorkspaceTaskForm } from "@/components/v2-workspace-task-form";
import { V2WorkspaceTaskStatusForm } from "@/components/v2-workspace-task-status-form";
import { prisma } from "@/lib/db";
import { requireProjectModule } from "@/lib/v2-access";
import { normalizedModuleKeys } from "@/lib/v2-modules";

export const dynamic = "force-dynamic";

const priorityLabel: Record<string, string> = { LOW: "Thấp", NORMAL: "Bình thường", HIGH: "Cao", URGENT: "Khẩn" };
const priorityTone: Record<string, string> = { LOW: "bg-slate-100 text-slate-600", NORMAL: "bg-blue-50 text-blue-700", HIGH: "bg-amber-50 text-amber-700", URGENT: "bg-rose-50 text-rose-700" };

function dateLabel(value: Date | null) {
  if (!value) return "Chưa đặt hạn";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(value);
}

export default async function ProjectTasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProjectModule(projectId, "tasks", { activeOnly: true });
  const enabled = new Set(normalizedModuleKeys(project.enabledFeatures));
  const taskModuleEnabled = enabled.has("tasks");

  const members = await prisma.zProjectMember.findMany({ where: { projectId: project.id, active: true }, select: { userId: true } });
  const memberIds = members.map((member) => member.userId);
  const memberUsers = memberIds.length ? await prisma.user.findMany({ where: { id: { in: memberIds }, active: true }, select: { id: true, fullName: true, username: true }, orderBy: { fullName: "asc" } }) : [];
  const tasks = taskModuleEnabled ? await prisma.zWorkspaceTask.findMany({ where: { projectId: project.id }, orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "desc" }], include: { assignee: { select: { fullName: true, username: true } } } }) : [];
  const todo = tasks.filter((task) => task.status === "TODO").length;
  const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const done = tasks.filter((task) => task.status === "DONE").length;

  return <div className="space-y-6">
    <Link href={`/du-an/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ListTodo className="h-4 w-4" />Về workspace {project.name}</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-sm font-medium text-brand-600">{project.code} · Module workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Task & quy trình</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Danh sách công việc riêng của <strong>{project.name}</strong>. Task ở đây không trộn với kế hoạch Nội Bộ hoặc Dự án khác.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Scope: {project.code}</span></div></header>

    {!taskModuleEnabled && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">Module Task đang tắt trong workspace này. Admin có thể bật module tại <Link href={`/du-an/${project.id}`} className="font-semibold underline">trang workspace</Link>; thao tác bật/tắt không xóa dữ liệu.</section>}

    {taskModuleEnabled && <>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chưa làm</p><p className="mt-2 text-2xl font-bold text-slate-900">{todo}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Đang làm</p><p className="mt-2 text-2xl font-bold text-slate-900">{inProgress}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hoàn thành</p><p className="mt-2 text-2xl font-bold text-slate-900">{done}</p></div></section>
      <V2WorkspaceTaskForm projectId={project.id} members={memberUsers} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-slate-900">Task của workspace</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{tasks.length}</span></div>{tasks.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có Task. Tạo Task đầu tiên để kiểm tra luồng vận hành riêng của Dự án.</div> : <div className="mt-4 space-y-3">{tasks.map((task) => <article key={task.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`font-semibold ${task.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone[task.priority] ?? priorityTone.NORMAL}`}>{priorityLabel[task.priority] ?? task.priority}</span></div>{task.description && <p className="mt-1 text-sm leading-5 text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{dateLabel(task.dueAt)}</span><span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{task.assignee ? `${task.assignee.fullName} · @${task.assignee.username}` : "Chưa phân công"}</span></div></div><V2WorkspaceTaskStatusForm projectId={project.id} taskId={task.id} status={task.status} /></div></article>)}</div>}</section>
    </>}
  </div>;
}
