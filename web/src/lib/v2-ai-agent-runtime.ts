import { prisma } from "./db";
import { evaluateAiAgentRequest, type AiAgentCaller, type AiAgentDescriptor } from "./v2-ai-agent-policy";
import { projectMemberCan, type ProjectCapability, type ProjectMemberPreset } from "./v2-project-capabilities";
import type { AiWorkspaceContext } from "./ai-governance";

export type RuntimeAiUser = { id: string; role: string };

export type RuntimeAiAgent = {
  id: string;
  descriptor: AiAgentDescriptor;
  caller: AiAgentCaller;
};

export type RuntimeAiAgentResolution =
  | { ok: true; agent: RuntimeAiAgent | null }
  | { ok: false; reason: string };

function allowlist(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
}

function membershipCapabilities(membership: { preset: string; permissions: unknown }) {
  return projectMemberCan({ preset: membership.preset as ProjectMemberPreset, permissions: membership.permissions }, "workspace.view") ? ["workspace.view" as ProjectCapability] : [];
}

export async function resolveRuntimeAiAgent(user: RuntimeAiUser, workspace: AiWorkspaceContext, requestedAgentId?: string | null): Promise<RuntimeAiAgentResolution> {
  if (workspace.workspaceKind === "INTERNAL") return { ok: true, agent: null };
  if (workspace.workspaceKind === "PROJECT" && !workspace.projectId) return { ok: false, reason: "AI project workspace requires projectId." };
  if (workspace.workspaceKind === "GLOBAL" && user.role !== "ADMIN") return { ok: false, reason: "Only Global Admin can use Global AI." };

  const activeProjects = await prisma.zProject.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  const accessibleProjectIds = user.role === "ADMIN"
    ? activeProjects.map((project) => project.id)
    : (await prisma.zProjectMember.findMany({ where: { userId: user.id, active: true, project: { status: "ACTIVE" } }, select: { projectId: true } })).map((membership) => membership.projectId);
  const memberships = await prisma.zProjectMember.findMany({ where: { userId: user.id, active: true, project: { status: "ACTIVE" } }, select: { projectId: true, preset: true, permissions: true } });
  const caller: AiAgentCaller = {
    role: user.role,
    accessibleProjectIds,
    memberships: memberships.map((membership) => ({ projectId: membership.projectId, active: true, capabilities: membershipCapabilities(membership) })),
  };

  // Fail-closed TRƯỚC khi tra agent: hàm này dựng `caller` kèm memberships nhưng
  // không tự gọi evaluateAiAgentRequest — membership chỉ được kiểm ở enforceRuntimeAiTool
  // lúc gọi tool. Nên các đường chỉ resolve mà không gọi tool (vd
  // startNewAssistantConversation) trước đây cho người KHÔNG phải thành viên gắn
  // hội thoại vào AI con của company khác, và phân biệt được company nào có AI ACTIVE
  // qua thông báo lỗi khác nhau (existence oracle). Chặn ngay tại đây, trước truy vấn.
  if (workspace.workspaceKind === "PROJECT" && !accessibleProjectIds.includes(workspace.projectId!)) {
    return { ok: false, reason: "Không có AI ACTIVE đúng phạm vi workspace hoặc agent đã bị dừng." };
  }

  const agent = await prisma.zAiAgent.findFirst({
    where: {
      ...(requestedAgentId ? { id: requestedAgentId } : {}),
      kind: workspace.workspaceKind === "PROJECT" ? "CHILD" : "GLOBAL",
      status: "ACTIVE",
      ...(workspace.workspaceKind === "PROJECT" ? { projectId: workspace.projectId } : { projectId: null }),
    },
    select: { id: true, kind: true, status: true, projectId: true, toolAllowlist: true },
  });
  if (!agent) return { ok: false, reason: "Không có AI ACTIVE đúng phạm vi workspace hoặc agent đã bị dừng." };
  return { ok: true, agent: { id: agent.id, descriptor: { kind: agent.kind, status: agent.status, projectId: agent.projectId, toolAllowlist: allowlist(agent.toolAllowlist) }, caller } };
}

export function enforceRuntimeAiTool(agent: RuntimeAiAgent | null, workspace: AiWorkspaceContext, request: { toolName: string; action: string; projectId?: string; targetProjectId?: string }) {
  if (!agent) return { ok: true as const };
  const policy = evaluateAiAgentRequest(agent.descriptor, agent.caller, { workspaceKind: workspace.workspaceKind, projectId: request.projectId ?? workspace.projectId, targetProjectId: request.targetProjectId, toolName: request.toolName, action: request.action });
  return policy.ok ? policy : { ok: false as const, reason: `AI agent policy denied: ${policy.reason}` };
}
