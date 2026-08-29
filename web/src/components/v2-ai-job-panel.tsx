"use client";

import { useActionState } from "react";
import { Play, XCircle, Clock, CheckCircle2, AlertCircle, ShieldAlert, ThumbsUp, ThumbsDown } from "lucide-react";
import { executeAiJobAction, cancelAiJobAction, approveAiJobAction, rejectAiJobAction, type AiJobActionState } from "@/lib/v2-ai-job-actions";

type JobItem = {
  id: string;
  idempotencyKey: string;
  toolName: string;
  action: string;
  status: string;
  attempt: number;
  maxAttempts: number;
  sourceWorkspaceKind: string;
  targetProjectId: string | null;
  targetProject: { code: string; name: string } | null;
  targetAgent: { name: string; code: string } | null;
  lastError: string | null;
  resultMeta: unknown;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

function JobStatusBadge({ status }: { status: string }) {
  if (status === "SUCCEEDED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Thành công
      </span>
    );
  }
  if (status === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
        <Clock className="h-3.5 w-3.5 animate-spin" /> Đang chạy
      </span>
    );
  }
  if (status === "QUEUED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        <Clock className="h-3.5 w-3.5" /> Đang chờ
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
        <XCircle className="h-3.5 w-3.5" /> Đã hủy
      </span>
    );
  }
  if (status === "PENDING_APPROVAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
        <ShieldAlert className="h-3.5 w-3.5" /> Chờ phê duyệt
      </span>
    );
  }
  if (status === "TIMED_OUT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
        <Clock className="h-3.5 w-3.5" /> Quá thời gian
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
      <AlertCircle className="h-3.5 w-3.5" /> Thất bại
    </span>
  );
}

function ExecuteJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState<AiJobActionState, FormData>(
    executeAiJobAction,
    {}
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        {isPending ? "Đang chạy..." : "Thực thi ngay"}
      </button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
      {state.message && <span className="text-xs text-emerald-600">{state.message}</span>}
    </form>
  );
}

function CancelJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState<AiJobActionState, FormData>(
    cancelAiJobAction,
    {}
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5 text-slate-500" />
        {isPending ? "Đang hủy..." : "Hủy"}
      </button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </form>
  );
}

/** Hiển thị bản xem trước rủi ro trước khi Admin quyết định duyệt — tránh duyệt mù. */
function ApprovalPreview({ resultMeta }: { resultMeta: unknown }) {
  if (!resultMeta || typeof resultMeta !== "object") return null;
  const meta = resultMeta as { riskLevel?: string; consequences?: string[]; requiredApprovals?: number };
  if (!meta.riskLevel) return null;
  return (
    <div className="mb-1.5 max-w-[260px] rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-[11px] text-orange-900">
      <p className="font-semibold">Mức rủi ro {meta.riskLevel}{meta.requiredApprovals ? ` · cần ${meta.requiredApprovals} người duyệt` : ""}</p>
      {Array.isArray(meta.consequences) && meta.consequences.length > 0 && (
        <ul className="mt-0.5 list-disc space-y-0.5 pl-3.5">
          {meta.consequences.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
    </div>
  );
}

function ApproveJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState<AiJobActionState, FormData>(approveAiJobAction, {});
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        {isPending ? "Đang duyệt..." : "Phê duyệt"}
      </button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </form>
  );
}

function RejectJobButton({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState<AiJobActionState, FormData>(rejectAiJobAction, {});
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="reason" value="Từ chối qua bảng điều khiển AI Tổng" />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        {isPending ? "Đang từ chối..." : "Từ chối"}
      </button>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </form>
  );
}

export function V2AiJobPanel({ jobs }: { jobs: JobItem[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Chưa có công việc AI (ZAiJob) nào được xếp hàng trong hệ thống.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">ID / Khóa</th>
            <th className="px-3 py-2">Agent & Target</th>
            <th className="px-3 py-2">Công cụ & Action</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Lần thử</th>
            <th className="px-3 py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50/60">
              <td className="px-3 py-3">
                <p className="font-mono text-xs font-semibold text-slate-800">{job.id.slice(0, 10)}...</p>
                <p className="font-mono text-[11px] text-slate-400">{job.idempotencyKey}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium text-slate-800">{job.targetAgent?.name ?? "Global AI"}</p>
                <p className="text-xs text-slate-500">
                  {job.targetProject ? `${job.targetProject.name} (${job.targetProject.code})` : "Toàn cục (GLOBAL)"}
                </p>
              </td>
              <td className="px-3 py-3">
                <p className="font-mono text-xs font-semibold text-indigo-700">{job.toolName}</p>
                <p className="font-mono text-[11px] text-slate-500">{job.action}</p>
              </td>
              <td className="px-3 py-3">
                <JobStatusBadge status={job.status} />
                {job.lastError && (
                  <p className="mt-1 max-w-[200px] truncate text-[11px] text-rose-600" title={job.lastError}>
                    {job.lastError}
                  </p>
                )}
              </td>
              <td className="px-3 py-3 text-xs text-slate-600">
                {job.attempt} / {job.maxAttempts}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  {job.status === "QUEUED" && (
                    <>
                      <ExecuteJobButton jobId={job.id} />
                      <CancelJobButton jobId={job.id} />
                    </>
                  )}
                  {job.status === "PENDING_APPROVAL" && (
                    <div>
                      <ApprovalPreview resultMeta={job.resultMeta} />
                      <div className="flex items-center gap-2">
                        <ApproveJobButton jobId={job.id} />
                        <RejectJobButton jobId={job.id} />
                      </div>
                    </div>
                  )}
                  {job.status === "FAILED" && job.attempt < job.maxAttempts && (
                    <ExecuteJobButton jobId={job.id} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
