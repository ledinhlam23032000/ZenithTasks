export type AiJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "CANCELLED";

export type AiJobTarget =
  | { kind: "CHILD"; agentId: string; projectId: string }
  | { kind: "GLOBAL"; agentId: string; projectId: null };

export type AiJobEnvelope = {
  idempotencyKey: string;
  requestedByUserId: string;
  source: { workspaceKind: "PROJECT" | "GLOBAL"; conversationId?: string; messageId?: string };
  target: AiJobTarget;
  toolName: string;
  action: string;
  arguments: Record<string, unknown>;
  timeoutMs: number;
  maxAttempts: number;
};

export type AiJobValidation = { ok: true } | { ok: false; reason: string };

export const AI_JOB_LIMITS = {
  minTimeoutMs: 1_000,
  maxTimeoutMs: 120_000,
  minAttempts: 1,
  maxAttempts: 3,
} as const;

const keyPattern = /^[A-Za-z0-9._:-]{16,160}$/;

export function validateAiJobEnvelope(job: AiJobEnvelope): AiJobValidation {
  if (!keyPattern.test(job.idempotencyKey)) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
  if (!job.requestedByUserId.trim()) return { ok: false, reason: "REQUESTER_REQUIRED" };
  if (!job.toolName.trim() || !job.action.trim()) return { ok: false, reason: "TOOL_ACTION_REQUIRED" };
  if (!Number.isInteger(job.timeoutMs) || job.timeoutMs < AI_JOB_LIMITS.minTimeoutMs || job.timeoutMs > AI_JOB_LIMITS.maxTimeoutMs) return { ok: false, reason: "TIMEOUT_OUT_OF_BOUNDS" };
  if (!Number.isInteger(job.maxAttempts) || job.maxAttempts < AI_JOB_LIMITS.minAttempts || job.maxAttempts > AI_JOB_LIMITS.maxAttempts) return { ok: false, reason: "RETRY_OUT_OF_BOUNDS" };
  if (job.source.workspaceKind === "PROJECT" && job.target.kind !== "CHILD") return { ok: false, reason: "PROJECT_SOURCE_REQUIRES_CHILD_TARGET" };
  if (job.source.workspaceKind === "GLOBAL" && job.target.kind !== "GLOBAL") return { ok: false, reason: "GLOBAL_SOURCE_REQUIRES_GLOBAL_TARGET" };
  if (job.target.kind === "CHILD" && (!job.target.agentId.trim() || !job.target.projectId.trim())) return { ok: false, reason: "CHILD_TARGET_SCOPE_REQUIRED" };
  if (job.target.kind === "GLOBAL" && job.target.projectId !== null) return { ok: false, reason: "GLOBAL_TARGET_MUST_NOT_HAVE_PROJECT_ID" };
  return { ok: true };
}

export function nextAiJobStatus(current: AiJobStatus, event: "START" | "SUCCEED" | "FAIL" | "TIMEOUT" | "CANCEL"): AiJobStatus {
  if (current === "QUEUED" && event === "START") return "RUNNING";
  if (current === "RUNNING" && event === "SUCCEED") return "SUCCEEDED";
  if (current === "RUNNING" && event === "FAIL") return "FAILED";
  if (current === "RUNNING" && event === "TIMEOUT") return "TIMED_OUT";
  if ((current === "QUEUED" || current === "RUNNING") && event === "CANCEL") return "CANCELLED";
  return current;
}
