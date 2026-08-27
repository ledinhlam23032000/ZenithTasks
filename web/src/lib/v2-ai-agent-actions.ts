"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectCapability, requireV2User } from "./v2-access";

export type AiAgentActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function agentCode(raw: string, kind: "CHILD" | "GLOBAL") {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (normalized.length < 3 || normalized.length > 36) return null;
  return `${kind === "CHILD" ? "AI-C" : "AI-G"}-${normalized}`;
}

function promptValue(raw: string) {
  return raw.length >= 20 ? raw.slice(0, 8000) : null;
}

export async function createProjectAiAgentAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const projectId = text(formData, "projectId", 80);
  const code = agentCode(text(formData, "code", 36), "CHILD");
  const name = text(formData, "name", 120);
  const systemPrompt = promptValue(text(formData, "systemPrompt", 8000));
  const model = text(formData, "model", 120) || null;
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (!code) return { error: "Mã AI cần 3–36 ký tự chữ, số, gạch ngang hoặc gạch dưới." };
  if (name.length < 2) return { error: "Tên AI cần ít nhất 2 ký tự." };
  if (!systemPrompt) return { error: "System prompt cần ít nhất 20 ký tự và phải mô tả phạm vi của AI con." };
  if (project.status === "ARCHIVED") return { error: "Company đã lưu trữ, không thể tạo AI con mới." };
  const existing = await prisma.zAiAgent.findUnique({ where: { code }, select: { id: true } });
  if (existing) return { error: "Mã AI đã tồn tại trong hệ thống." };
  const created = await prisma.$transaction(async (tx) => {
    const agent = await tx.zAiAgent.create({ data: { code, name, kind: "CHILD", status: "DRAFT", projectId: project.id, createdById: user.id, systemPrompt, model, toolAllowlist: [], config: { scope: "PROJECT", projectId: project.id } } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_CHILD_AI_CREATED", entity: "ZAiAgent", entityId: agent.id, meta: { projectId: project.id, agentId: agent.id, kind: "CHILD", status: "DRAFT", code } } });
    return agent;
  });
  revalidatePath(`/du-an/${project.id}`);
  revalidatePath(`/du-an/${project.id}/ai`);
  return { ok: true, message: `Đã tạo AI con ${created.code} ở DRAFT. Chưa được phép xử lý nghiệp vụ cho đến khi kích hoạt.` };
}

export async function activateProjectAiAgentAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const projectId = text(formData, "projectId", 80);
  const agentId = text(formData, "agentId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (confirmation !== "ACTIVATE") return { error: "Nhập ACTIVATE để xác nhận kích hoạt AI con." };
  if (project.status !== "ACTIVE") return { error: "Chỉ company ACTIVE mới được kích hoạt AI con." };
  const result = await prisma.zAiAgent.updateMany({ where: { id: agentId, projectId: project.id, kind: "CHILD", status: "DRAFT" }, data: { status: "ACTIVE" } });
  if (result.count !== 1) return { error: "AI con không tồn tại, sai company hoặc không còn ở DRAFT." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_CHILD_AI_ACTIVATED", entity: "ZAiAgent", entityId: agentId, meta: { projectId: project.id, agentId, kind: "CHILD", status: "ACTIVE" } } });
  revalidatePath(`/du-an/${project.id}`);
  revalidatePath(`/du-an/${project.id}/ai`);
  return { ok: true, message: "Đã kích hoạt AI con trong phạm vi company ACTIVE." };
}

export async function setProjectAiAgentStatusAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const projectId = text(formData, "projectId", 80);
  const agentId = text(formData, "agentId", 80);
  const status = text(formData, "status", 16).toUpperCase();
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (status !== "SUSPENDED" && status !== "ARCHIVED") return { error: "Chỉ được SUSPEND hoặc ARCHIVE AI con qua action này." };
  const result = await prisma.zAiAgent.updateMany({ where: { id: agentId, projectId: project.id, kind: "CHILD", status: "ACTIVE" }, data: { status: status as "SUSPENDED" | "ARCHIVED" } });
  if (result.count !== 1) return { error: "AI con không tồn tại, sai company hoặc chưa ACTIVE." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: status === "SUSPENDED" ? "V2_CHILD_AI_SUSPENDED" : "V2_CHILD_AI_ARCHIVED", entity: "ZAiAgent", entityId: agentId, meta: { projectId: project.id, agentId, kind: "CHILD", status } } });
  revalidatePath(`/du-an/${project.id}`);
  revalidatePath(`/du-an/${project.id}/ai`);
  return { ok: true, message: status === "SUSPENDED" ? "Đã tạm dừng AI con; conversation/audit vẫn được giữ." : "Đã archive AI con; không xóa lịch sử." };
}

export async function createGlobalAiAgentAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const user = await requireV2User();
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được tạo AI Tổng." };
  const code = agentCode(text(formData, "code", 36), "GLOBAL");
  const name = text(formData, "name", 120);
  const systemPrompt = promptValue(text(formData, "systemPrompt", 8000));
  const model = text(formData, "model", 120) || null;
  if (!code) return { error: "Mã AI Tổng cần 3–36 ký tự chữ, số, gạch ngang hoặc gạch dưới." };
  if (name.length < 2) return { error: "Tên AI Tổng cần ít nhất 2 ký tự." };
  if (!systemPrompt) return { error: "System prompt cần ít nhất 20 ký tự và phải mô tả rõ quyền aggregate của AI Tổng." };
  const existing = await prisma.zAiAgent.findUnique({ where: { code }, select: { id: true } });
  if (existing) return { error: "Mã AI Tổng đã tồn tại trong hệ thống." };
  const created = await prisma.$transaction(async (tx) => {
    const agent = await tx.zAiAgent.create({ data: { code, name, kind: "GLOBAL", status: "DRAFT", createdById: user.id, systemPrompt, model, toolAllowlist: ["get_workspace_overview"], config: { scope: "GLOBAL", requiresExplicitProjectTarget: true, canControlChildAgents: true } } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_GLOBAL_AI_CREATED", entity: "ZAiAgent", entityId: agent.id, meta: { agentId: agent.id, kind: "GLOBAL", status: "DRAFT", code } } });
    return agent;
  });
  revalidatePath("/du-an");
  revalidatePath("/tro-ly");
  return { ok: true, message: `Đã tạo AI Tổng ${created.code} ở DRAFT. AI Tổng chỉ được aggregate có giới hạn và phải nêu rõ company khi đi sâu.` };
}

export async function activateGlobalAiAgentAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const user = await requireV2User();
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được kích hoạt AI Tổng." };
  const agentId = text(formData, "agentId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  if (confirmation !== "ACTIVATE") return { error: "Nhập ACTIVATE để xác nhận kích hoạt AI Tổng." };
  const result = await prisma.zAiAgent.updateMany({ where: { id: agentId, projectId: null, kind: "GLOBAL", status: "DRAFT" }, data: { status: "ACTIVE" } });
  if (result.count !== 1) return { error: "AI Tổng không tồn tại hoặc không còn ở DRAFT." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_GLOBAL_AI_ACTIVATED", entity: "ZAiAgent", entityId: agentId, meta: { agentId, kind: "GLOBAL", status: "ACTIVE" } } });
  revalidatePath("/du-an");
  revalidatePath("/tro-ly");
  return { ok: true, message: "Đã kích hoạt AI Tổng. Aggregate vẫn bị giới hạn bởi policy và audit." };
}

export async function setGlobalAiAgentStatusAction(_prev: AiAgentActionState, formData: FormData): Promise<AiAgentActionState> {
  const user = await requireV2User();
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được đổi trạng thái AI Tổng." };
  const agentId = text(formData, "agentId", 80);
  const status = text(formData, "status", 16).toUpperCase();
  if (status !== "SUSPENDED" && status !== "ARCHIVED") return { error: "Chỉ được SUSPEND hoặc ARCHIVE AI Tổng qua action này." };
  const result = await prisma.zAiAgent.updateMany({ where: { id: agentId, projectId: null, kind: "GLOBAL", status: "ACTIVE" }, data: { status: status as "SUSPENDED" | "ARCHIVED" } });
  if (result.count !== 1) return { error: "AI Tổng không tồn tại hoặc chưa ACTIVE." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: status === "SUSPENDED" ? "V2_GLOBAL_AI_SUSPENDED" : "V2_GLOBAL_AI_ARCHIVED", entity: "ZAiAgent", entityId: agentId, meta: { agentId, kind: "GLOBAL", status } } });
  revalidatePath("/du-an");
  revalidatePath("/tro-ly");
  return { ok: true, message: status === "SUSPENDED" ? "Đã tạm dừng AI Tổng." : "Đã archive AI Tổng; không xóa lịch sử." };
}
