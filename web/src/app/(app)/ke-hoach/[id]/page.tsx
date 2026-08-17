import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtRelative } from "@/lib/format";
import { planProgress, PLAN_STATUS_LABEL, PLAN_STATUS_TONE } from "@/lib/plans";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { Markdown } from "@/components/ui/markdown";
import { deletePlan } from "../actions";
import { EditPlanButton } from "../plan-widgets";
import { TaskTree } from "./task-widgets";
import type { TaskRowData } from "../task-row";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chi tiết kế hoạch" };

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCap("mod:ke-hoach");
  const { id } = await params;

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { order: "asc" } },
      createdBy: { select: { fullName: true } },
    },
  });
  if (!plan) notFound();

  const mains = plan.tasks.filter((t) => t.parentId === null);
  const tree: TaskRowData[] = mains.map((m) => ({
    id: m.id,
    title: m.title,
    note: m.note,
    status: m.status,
    subtasks: plan.tasks
      .filter((t) => t.parentId === m.id)
      .map((s) => ({ id: s.id, title: s.title, note: s.note, status: s.status, subtasks: [] })),
  }));

  const progress = planProgress(plan.tasks);

  return (
    <div className="space-y-6">
      <Link
        href="/ke-hoach"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Danh sách kế hoạch
      </Link>

      <PageHeader
        title={plan.title}
        description={plan.createdBy ? `Tạo bởi ${plan.createdBy.fullName} · ${fmtRelative(plan.createdAt)}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <EditPlanButton plan={{ id: plan.id, title: plan.title, note: plan.note ?? "" }} />
            <DeleteButton
              action={deletePlan}
              id={plan.id}
              label="Xóa kế hoạch"
              confirmText={`Xóa kế hoạch "${plan.title}"? Toàn bộ nhiệm vụ bên trong cũng bị xóa.`}
            />
          </div>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {plan.aiGenerated && (
            <Badge tone="purple">
              <Sparkles className="h-3 w-3" /> Do AI tạo
            </Badge>
          )}
          <Badge tone={PLAN_STATUS_TONE[progress.status]}>{PLAN_STATUS_LABEL[progress.status]}</Badge>
          <span className="text-xs text-slate-400">
            {progress.done}/{progress.total} nhiệm vụ hoàn thành ({progress.percent}%)
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
        {plan.note && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Markdown text={plan.note} className="text-sm text-slate-600" />
          </div>
        )}
      </Card>

      <Card className="p-3 sm:p-4">
        <TaskTree planId={plan.id} tasks={tree} />
      </Card>
    </div>
  );
}
