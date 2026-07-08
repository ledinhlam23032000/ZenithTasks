import Link from "next/link";
import { ListTree, Sparkles, Trash2 } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { fmtRelative } from "@/lib/format";
import { planProgress, PLAN_STATUS_LABEL, PLAN_STATUS_TONE, type PlanOverallStatus } from "@/lib/plans";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { DeleteButton } from "@/components/ui/delete-button";
import { PAGE_SIZE, parsePage, totalPagesOf } from "@/lib/pagination";
import { deletePlan } from "./actions";
import { AddPlanButton } from "./plan-widgets";
import { AiPlanButton } from "./ai-plan-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kế hoạch" };

const STATUS_TABS: { key: "all" | PlanOverallStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "NOT_STARTED", label: "Chưa bắt đầu" },
  { key: "IN_PROGRESS", label: "Đang làm" },
  { key: "DONE", label: "Hoàn thành" },
];

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireCap("mod:ke-hoach");
  const sp = await searchParams;
  const statusFilter = STATUS_TABS.some((t) => t.key === sp.status) ? (sp.status as "all" | PlanOverallStatus) : "all";
  const page = parsePage(sp.page);

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    include: { tasks: { select: { status: true } }, createdBy: { select: { fullName: true } } },
  });

  const withProgress = plans.map((p) => ({ ...p, progress: planProgress(p.tasks) }));
  const counts: Record<"all" | PlanOverallStatus, number> = { all: withProgress.length, NOT_STARTED: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const p of withProgress) counts[p.progress.status]++;

  const filtered = statusFilter === "all" ? withProgress : withProgress.filter((p) => p.progress.status === statusFilter);
  const total = filtered.length;
  const totalPages = totalPagesOf(total);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/ke-hoach${s ? `?${s}` : ""}`;
  };
  const qs = (key: string) => `/ke-hoach${key === "all" ? "" : `?status=${key}`}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kế hoạch"
        description="Lập kế hoạch nội bộ — nhiệm vụ chính, nhiệm vụ phụ, ghi chú chi tiết."
        icon={<ListTree className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <AddPlanButton />
            <AiPlanButton aiOn={aiConfigured()} />
          </div>
        }
      />

      <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.key}
            href={qs(t.key)}
            className={`rounded-md px-3 py-1.5 ${statusFilter === t.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </div>

      {pageItems.length === 0 ? (
        <EmptyState
          icon={<ListTree className="h-6 w-6" />}
          title="Chưa có kế hoạch nào"
          description="Tạo kế hoạch mới hoặc để AI soạn nháp giúp bạn."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((p) => (
            <Link key={p.id} href={`/ke-hoach/${p.id}`} className="group block">
              <Card className="h-full p-4 transition group-hover:border-brand-300 group-hover:shadow-md sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-semibold text-slate-800 group-hover:text-brand-700">{p.title}</h3>
                  <span className="shrink-0 opacity-0 transition group-hover:opacity-100">
                    <DeleteButton
                      action={deletePlan}
                      id={p.id}
                      label=""
                      confirmText={`Xóa kế hoạch "${p.title}"? Toàn bộ nhiệm vụ bên trong cũng bị xóa.`}
                      className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                    />
                  </span>
                </div>
                {p.aiGenerated && (
                  <Badge tone="purple" className="mt-1.5">
                    <Sparkles className="h-3 w-3" /> Do AI tạo
                  </Badge>
                )}
                {p.note && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.note}</p>}

                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${p.progress.percent}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {p.progress.done}/{p.progress.total} nhiệm vụ hoàn thành ({p.progress.percent}%)
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge tone={PLAN_STATUS_TONE[p.progress.status]}>{PLAN_STATUS_LABEL[p.progress.status]}</Badge>
                  <span className="truncate text-xs text-slate-400">
                    {p.createdBy?.fullName ?? "—"} · {fmtRelative(p.createdAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
