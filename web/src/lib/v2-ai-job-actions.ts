"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { requireV2User } from "./v2-access";
import { enforceRuntimeAiTool, resolveRuntimeAiAgent } from "./v2-ai-agent-runtime";
import { validateAiJobEnvelope, type AiJobDataAccess, type AiJobEnvelope } from "./v2-ai-job-contract";
import type { AiWorkspaceContext } from "./ai-governance";

export type AiJobActionState = { ok?: boolean; error?: string; message?: string; jobId?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function integer(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key) ?? fallback);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function isDataAccess(value: string): value is AiJobDataAccess {
  return value === "METADATA_ONLY" || value === "SCOPED_PROJECT_DATA" || value === "APPROVED_RAW_TENANT_DATA";
}

export async function enqueueAiJobAction(_prev: AiJobActionState, formData: FormData): Promise<AiJobActionState> {
  const user = await requireV2User();
  const workspaceKind = text(formData, "workspaceKind", 16).toUpperCase() as AiWorkspaceContext["workspaceKind"];
  const sourceProjectId = text(formData, "projectId", 80) || undefined;
  const targetKind = (text(formData, "targetKind", 16).toUpperCase() || (workspaceKind === "PROJECT" ? "CHILD" : "GLOBAL"));
  const targetProjectId = text(formData, "targetProjectId", 80) || sourceProjectId;
  const agentId = text(formData, "agentId", 80);
  const toolName = text(formData, "toolName", 120);
  const action = text(formData, "action", 120);
  const idempotencyKey = text(formData, "idempotencyKey", 160);
  const sourceConversationId = text(formData, "conversationId", 80) || undefined;
  const sourceMessageId = text(formData, "messageId", 80) || undefined;
  const approvalId = text(formData, "approvalId", 120) || undefined;
  const dataAccessRaw = text(formData, "dataAccess", 40).toUpperCase() || "METADATA_ONLY";
  const dataAccess = isDataAccess(dataAccessRaw) ? dataAccessRaw : null;
  const timeoutMs = integer(formData, "timeoutMs", 30_000);
  const maxAttempts = integer(formData, "maxAttempts", 2);

  // Parse arguments JSON payload — KHÔNG được hardcode {}
  let parsedArguments: Record<string, unknown> = {};
  const rawArguments = String(formData.get("arguments") ?? "").trim();
  if (rawArguments) {
    try {
      const parsed = JSON.parse(rawArguments);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedArguments = parsed;
      } else {
        return { error: "Tham số AI Job phải là JSON object hợp lệ (không phải array hoặc primitive)." };
      }
    } catch {
      return { error: `Tham số AI Job không phải JSON hợp lệ: ${rawArguments.slice(0, 200)}` };
    }
  }

  if (workspaceKind !== "PROJECT" && workspaceKind !== "GLOBAL") return { error: "Workspace AI job không hợp lệ." };
  if (targetKind !== "CHILD" && targetKind !== "GLOBAL") return { error: "Target AI job không hợp lệ." };
  if (!agentId) return { error: "Phải chỉ rõ agent đích; không suy đoán agent từ prompt." };
  if (workspaceKind === "PROJECT" && (!sourceProjectId || targetKind !== "CHILD")) return { error: "AI project job phải target CHILD cùng projectId explicit." };
  if (workspaceKind === "GLOBAL" && targetKind === "CHILD" && !targetProjectId) return { error: "Global→Child bắt buộc targetProjectId explicit." };
  if (workspaceKind === "GLOBAL" && user.role !== "ADMIN") return { error: "Chỉ Global Admin được điều phối job từ Global AI." };
  if (!dataAccess) return { error: "Data access policy không hợp lệ." };

  const targetWorkspace: AiWorkspaceContext = targetKind === "CHILD" ? { workspaceKind: "PROJECT", projectId: targetProjectId! } : { workspaceKind: "GLOBAL" };
  const resolution = await resolveRuntimeAiAgent(user, targetWorkspace, agentId);
  if (!resolution.ok || !resolution.agent) return { error: resolution.ok ? "Không có agent ACTIVE đúng scope." : resolution.reason };
  const policy = enforceRuntimeAiTool(resolution.agent, targetWorkspace, { toolName, action, projectId: targetProjectId, targetProjectId });
  if (!policy.ok) return { error: policy.reason };

  const envelope: AiJobEnvelope = {
    idempotencyKey,
    requestedByUserId: user.id,
    source: workspaceKind === "PROJECT"
      ? { workspaceKind, projectId: sourceProjectId!, ...(sourceConversationId ? { conversationId: sourceConversationId } : {}), ...(sourceMessageId ? { messageId: sourceMessageId } : {}) }
      : { workspaceKind, ...(sourceConversationId ? { conversationId: sourceConversationId } : {}), ...(sourceMessageId ? { messageId: sourceMessageId } : {}) },
    target: targetKind === "CHILD" ? { kind: "CHILD", agentId: resolution.agent.id, projectId: targetProjectId! } : { kind: "GLOBAL", agentId: resolution.agent.id, projectId: null },
    toolName,
    action,
    arguments: parsedArguments,
    dataAccess,
    requiresRuntimeReauthorization: true,
    ...(approvalId ? { approvalId } : {}),
    timeoutMs,
    maxAttempts,
  };
  const valid = validateAiJobEnvelope(envelope);
  if (!valid.ok) return { error: valid.reason };

  // Tra trong phạm vi CHÍNH NGƯỜI YÊU CẦU. Tra toàn cục thì một tenant chiếm chỗ key
  // là tenant khác bị từ chối oan, và phản hồi khác nhau để lộ key nào đã tồn tại.
  const existing = await prisma.zAiJob.findUnique({ where: { requestedById_idempotencyKey: { requestedById: user.id, idempotencyKey } }, select: { id: true, requestedById: true, targetAgentId: true, toolName: true, action: true } });
  if (existing) {
    if (existing.targetAgentId !== resolution.agent.id || existing.toolName !== toolName || existing.action !== action) return { error: "IDEMPOTENCY_KEY_CONFLICT" };
    return { ok: true, jobId: existing.id, message: "Job đã tồn tại với cùng idempotency key; không tạo bản sao." };
  }

  const created = await prisma.$transaction(async (tx) => {
    const job = await tx.zAiJob.create({
      data: {
        idempotencyKey,
        requestedById: user.id,
        sourceWorkspaceKind: workspaceKind,
        sourceProjectId: workspaceKind === "PROJECT" ? sourceProjectId : null,
        conversationId: sourceConversationId,
        messageId: sourceMessageId,
        targetAgentId: resolution.agent!.id,
        // BUG ĐÃ SỬA: trước đây luôn ghi null khi targetKind==="GLOBAL", nên
        // KHÔNG có cách nào enqueue một job GLOBAL nhắm vào 1 company cụ thể
        // (vd suspend_child_agent — GLOBAL agent tạm dừng 1 CHILD agent thuộc
        // đúng project X). Policy check ở enforceRuntimeAiTool phía trên ĐÃ xác
        // nhận targetProjectId hợp lệ với đúng agent/scope này (dòng enforceRuntimeAiTool
        // ở trên) — executeAiJobRunner đọc lại targetProjectId đã lưu để tái xác
        // thực runtime, nên nếu lưu null thì bằng chứng đã qua bị vứt bỏ, và
        // job luôn FAIL "GLOBAL_TARGET_REQUIRED" khi thực thi dù enqueue đã pass.
        // Aggregate action (get_workspace_overview...) không gửi targetProjectId
        // nên vẫn tự nhiên là null — không cần nhánh riêng theo targetKind.
        targetProjectId: targetProjectId || null,
        toolName,
        action,
        arguments: parsedArguments as Prisma.InputJsonValue,
        dataAccess,
        requiresRuntimeReauthorization: true,
        approvalId,
        maxAttempts,
        timeoutMs,
      },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_AI_JOB_QUEUED", entity: "ZAiJob", entityId: job.id, meta: { jobId: job.id, agentId: resolution.agent!.id, projectId: targetKind === "CHILD" ? targetProjectId : null, workspaceKind, targetKind, toolName, action, idempotencyKey, dataAccess } } });
    return job;
  });
  revalidatePath("/tro-ly");
  revalidatePath("/he-thong/ai-tong");
  return { ok: true, jobId: created.id, message: "Đã xếp job với target, timeout, retry, policy và audit trace explicit." };
}

export async function executeAiJobAction(_prev: AiJobActionState, formData: FormData): Promise<AiJobActionState> {
  const user = await requireV2User();
  const jobId = text(formData, "jobId", 80);
  if (!jobId) return { error: "Thiếu ID công việc AI." };

  const { executeAiJobRunner } = await import("./v2-ai-job-engine");
  const result = await executeAiJobRunner(jobId, user.id);

  revalidatePath("/tro-ly");
  revalidatePath("/he-thong/ai-tong");

  if (!result.ok) {
    return {
      ok: false,
      jobId,
      error: `Thực thi job thất bại: ${result.error ?? "Lỗi không xác định"} (Trạng thái: ${result.status}, Lần thử: ${result.attempt})`,
    };
  }

  return {
    ok: true,
    jobId,
    message: `Đã thực thi thành công job AI (${jobId}) với trạng thái ${result.status}.`,
  };
}

export async function cancelAiJobAction(_prev: AiJobActionState, formData: FormData): Promise<AiJobActionState> {
  const user = await requireV2User();
  const jobId = text(formData, "jobId", 80);
  if (!jobId) return { error: "Thiếu ID công việc AI." };

  const job = await prisma.zAiJob.findUnique({ where: { id: jobId } });
  if (!job) return { error: "Không tìm thấy công việc AI." };

  if (job.status === "SUCCEEDED" || job.status === "CANCELLED") {
    return { error: `Không thể hủy công việc đã ở trạng thái ${job.status}.` };
  }

  if (user.role !== "ADMIN" && job.requestedById !== user.id) {
    return { error: "Chỉ Admin hoặc người tạo job mới được hủy." };
  }

  await prisma.zAiJob.update({
    where: { id: jobId },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "V2_AI_JOB_CANCELLED",
      entity: "ZAiJob",
      entityId: jobId,
      meta: { jobId, previousStatus: job.status },
    },
  });

  revalidatePath("/tro-ly");
  revalidatePath("/he-thong/ai-tong");

  return { ok: true, jobId, message: `Đã hủy công việc AI (${jobId}).` };
}

// ---- Approval gate: duyệt / từ chối AI job đang chờ ----
//
// Vì sao cần: `executeAiJobRunner` đẩy job rủi ro L4/L5 sang PENDING_APPROVAL,
// nhưng trước wave này KHÔNG có đường nào đưa job ra khỏi trạng thái đó —
// atomic lock của worker chỉ nhận `status='QUEUED'`, nên job đã duyệt cũng
// không bao giờ chạy. Approval gate khi đó là ngõ cụt.

async function loadPendingJob(jobId: string) {
  return prisma.zAiJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, requestedById: true, targetProjectId: true, resultMeta: true, toolName: true, action: true },
  });
}

function riskLevelOf(resultMeta: unknown): string | null {
  if (!resultMeta || typeof resultMeta !== "object") return null;
  const level = (resultMeta as Record<string, unknown>).riskLevel;
  return typeof level === "string" ? level : null;
}

export async function approveAiJobAction(_prev: AiJobActionState, formData: FormData): Promise<AiJobActionState> {
  const user = await requireV2User();
  if (user.role !== "ADMIN") return { error: "Chỉ Admin được phê duyệt AI job." };
  const jobId = text(formData, "jobId", 80);
  if (!jobId) return { error: "Thiếu jobId." };

  const job = await loadPendingJob(jobId);
  if (!job) return { error: "Không tìm thấy job." };
  if (job.status !== "PENDING_APPROVAL") return { error: `Job đang ở trạng thái ${job.status}, không phải PENDING_APPROVAL.` };

  // Two-person rule cho rủi ro cao nhất: người duyệt không được là người yêu cầu.
  // L4 vẫn cho phép cùng người nhưng BẮT BUỘC có bước duyệt tường minh.
  if (riskLevelOf(job.resultMeta) === "L5" && job.requestedById === user.id) {
    return { error: "Job rủi ro L5 cần người phê duyệt KHÁC người yêu cầu (two-person approval)." };
  }

  const approvalId = `apr_${jobId}_${user.id}`;
  // updateMany + điều kiện status để hai lần bấm đồng thời không cùng duyệt được.
  const result = await prisma.zAiJob.updateMany({
    where: { id: jobId, status: "PENDING_APPROVAL" },
    data: { status: "QUEUED", approvalId, lastError: null },
  });
  if (result.count !== 1) return { error: "Job đã đổi trạng thái bởi thao tác khác; hãy tải lại." };

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "V2_AI_JOB_APPROVED",
      entity: "ZAiJob",
      entityId: jobId,
      meta: { jobId, approvalId, approvedBy: user.id, requestedBy: job.requestedById, toolName: job.toolName, action: job.action, riskLevel: riskLevelOf(job.resultMeta) },
    },
  });
  revalidatePath("/he-thong/ai-tong");
  return { ok: true, jobId, message: "Đã phê duyệt; job quay lại hàng đợi để worker thực thi." };
}

export async function rejectAiJobAction(_prev: AiJobActionState, formData: FormData): Promise<AiJobActionState> {
  const user = await requireV2User();
  if (user.role !== "ADMIN") return { error: "Chỉ Admin được từ chối AI job." };
  const jobId = text(formData, "jobId", 80);
  const reason = text(formData, "reason", 500);
  if (!jobId) return { error: "Thiếu jobId." };

  const job = await loadPendingJob(jobId);
  if (!job) return { error: "Không tìm thấy job." };
  if (job.status !== "PENDING_APPROVAL") return { error: `Job đang ở trạng thái ${job.status}, không phải PENDING_APPROVAL.` };

  const result = await prisma.zAiJob.updateMany({
    where: { id: jobId, status: "PENDING_APPROVAL" },
    data: { status: "CANCELLED", lastError: reason || "REJECTED_BY_ADMIN", finishedAt: new Date() },
  });
  if (result.count !== 1) return { error: "Job đã đổi trạng thái bởi thao tác khác; hãy tải lại." };

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "V2_AI_JOB_REJECTED",
      entity: "ZAiJob",
      entityId: jobId,
      meta: { jobId, rejectedBy: user.id, requestedBy: job.requestedById, reason: reason || null },
    },
  });
  revalidatePath("/he-thong/ai-tong");
  return { ok: true, jobId, message: "Đã từ chối job; job chuyển sang CANCELLED và không thể tự chạy lại." };
}
