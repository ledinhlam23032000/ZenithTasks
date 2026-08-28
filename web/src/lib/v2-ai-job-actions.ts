"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
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
    arguments: {},
    dataAccess,
    requiresRuntimeReauthorization: true,
    ...(approvalId ? { approvalId } : {}),
    timeoutMs,
    maxAttempts,
  };
  const valid = validateAiJobEnvelope(envelope);
  if (!valid.ok) return { error: valid.reason };

  const existing = await prisma.zAiJob.findUnique({ where: { idempotencyKey }, select: { id: true, requestedById: true, targetAgentId: true, toolName: true, action: true } });
  if (existing) {
    if (existing.requestedById !== user.id || existing.targetAgentId !== resolution.agent.id || existing.toolName !== toolName || existing.action !== action) return { error: "IDEMPOTENCY_KEY_CONFLICT" };
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
        targetProjectId: targetKind === "CHILD" ? targetProjectId : null,
        toolName,
        action,
        arguments: {},
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
  return { ok: true, jobId: created.id, message: "Đã xếp job với target, timeout, retry, policy và audit trace explicit. Worker chưa tự chạy trong wave này." };
}
