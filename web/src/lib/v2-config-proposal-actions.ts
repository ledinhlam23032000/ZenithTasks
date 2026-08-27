"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { requireProjectCapability } from "./v2-access";
import { canApplyWorkspaceProposal, isSafeWorkspaceProposalRisk } from "./v2-config-proposal-policy";
import { normalizedModuleKeys } from "./v2-modules";
import { isCompleteWorkspaceLayout } from "./v2-workspace-navigation";

export type ConfigProposalActionState = { ok?: boolean; error?: string; message?: string };
const kinds = new Set(["MODULES", "LAYOUT", "SETTINGS"]);
const risks = new Set(["L1", "L2", "L3", "L4"]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function jsonObject(raw: string): Prisma.InputJsonValue | null {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Prisma.InputJsonValue : null;
  } catch {
    return null;
  }
}

function kindOf(value: string) {
  return kinds.has(value.toUpperCase()) ? value.toUpperCase() as "MODULES" | "LAYOUT" | "SETTINGS" : null;
}

export async function createWorkspaceConfigProposalAction(_prev: ConfigProposalActionState, formData: FormData): Promise<ConfigProposalActionState> {
  const projectId = text(formData, "projectId", 80);
  const moduleKey = kindOf(text(formData, "moduleKey", 24));
  const riskLevel = text(formData, "riskLevel", 4).toUpperCase();
  const capability = text(formData, "capability", 120);
  const afterConfig = jsonObject(text(formData, "afterConfig", 8000));
  const note = text(formData, "note", 1000) || null;
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (!moduleKey) return { error: "moduleKey phải là MODULES, LAYOUT hoặc SETTINGS." };
  if (!risks.has(riskLevel) || !isSafeWorkspaceProposalRisk(riskLevel)) return { error: "Risk L5 bị chặn; proposal chỉ nhận L1–L4." };
  if (capability.length < 3) return { error: "Proposal phải nêu capability cần thiết." };
  if (!afterConfig) return { error: "afterConfig phải là JSON object hợp lệ." };
  const beforeConfig = moduleKey === "MODULES" ? { enabledFeatures: Array.isArray(project.enabledFeatures) ? project.enabledFeatures.map(String) : [] } : moduleKey === "SETTINGS" ? (project.settings && typeof project.settings === "object" && !Array.isArray(project.settings) ? project.settings : {}) : {};
  const created = await prisma.zWorkspaceConfigProposal.create({ data: { projectId: project.id, moduleKey, targetScope: "PROJECT", status: "DRAFT", riskLevel, capability, beforeConfig, afterConfig, note, createdById: user.id } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CONFIG_PROPOSAL_CREATED", entity: "ZWorkspaceConfigProposal", entityId: created.id, meta: { projectId: project.id, targetScope: "PROJECT", moduleKey, riskLevel, capability } } });
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã tạo proposal ${created.id} ở DRAFT. Chưa thay đổi cấu hình.` };
}

export async function approveWorkspaceConfigProposalAction(_prev: ConfigProposalActionState, formData: FormData): Promise<ConfigProposalActionState> {
  const projectId = text(formData, "projectId", 80);
  const proposalId = text(formData, "proposalId", 80);
  const confirmation = text(formData, "confirmation", 24).toUpperCase();
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (confirmation !== "APPROVE") return { error: "Nhập APPROVE để xác nhận preview đã được kiểm tra." };
  const result = await prisma.zWorkspaceConfigProposal.updateMany({ where: { id: proposalId, projectId: project.id, targetScope: "PROJECT", status: "DRAFT" }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } });
  if (result.count !== 1) return { error: "Proposal không tồn tại, sai project hoặc không còn ở DRAFT." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CONFIG_PROPOSAL_APPROVED", entity: "ZWorkspaceConfigProposal", entityId: proposalId, meta: { projectId: project.id, targetScope: "PROJECT" } } });
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: "Đã APPROVE proposal. Chưa APPLY và chưa đổi cấu hình." };
}

export async function applyWorkspaceConfigProposalAction(_prev: ConfigProposalActionState, formData: FormData): Promise<ConfigProposalActionState> {
  const projectId = text(formData, "projectId", 80);
  const proposalId = text(formData, "proposalId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (!canApplyWorkspaceProposal("APPROVED", "PROJECT", confirmation)) return { error: "Nhập APPLY để xác nhận áp dụng proposal." };
  try {
    await prisma.$transaction(async (tx) => {
      const proposal = await tx.zWorkspaceConfigProposal.findFirst({ where: { id: proposalId, projectId: project.id, targetScope: "PROJECT", status: "APPROVED" }, select: { id: true, moduleKey: true, beforeConfig: true, afterConfig: true, approvedById: true, riskLevel: true } });
      if (!proposal) throw new Error("PROPOSAL_NOT_APPROVED");
      const kind = kindOf(proposal.moduleKey);
      if (!kind || (proposal.riskLevel as string) === "L5") throw new Error("PROPOSAL_RISK_BLOCKED");
      if (!proposal.afterConfig || typeof proposal.afterConfig !== "object" || Array.isArray(proposal.afterConfig)) throw new Error("PROPOSAL_CONFIG_EMPTY");
      const afterConfig = proposal.afterConfig as Prisma.InputJsonValue;
      if (kind === "LAYOUT") {
        const config = afterConfig as { order?: unknown };
        const enabled = normalizedModuleKeys(project.enabledFeatures);
        if (!isCompleteWorkspaceLayout(config.order, enabled)) throw new Error("LAYOUT_CONFIG_INVALID");
      }
      const latest = await tx.zWorkspaceConfigVersion.findFirst({ where: { projectId: project.id, kind }, orderBy: { version: "desc" }, select: { version: true, id: true } });
      const nextVersion = (latest?.version ?? 0) + 1;
      await tx.zWorkspaceConfigVersion.updateMany({ where: { projectId: project.id, kind, status: "ACTIVE" }, data: { status: "SUPERSEDED", effectiveTo: new Date() } });
      const version = await tx.zWorkspaceConfigVersion.create({ data: { projectId: project.id, kind, version: nextVersion, status: "ACTIVE", config: afterConfig, effectiveFrom: new Date(), createdById: user.id, approvedById: proposal.approvedById ?? user.id, note: `Applied proposal ${proposal.id}` } });
      if (kind === "MODULES") {
        const config = afterConfig as { enabledFeatures?: unknown };
        const enabledFeatures = Array.isArray(config.enabledFeatures) ? config.enabledFeatures.map(String) : [];
        if (enabledFeatures.length === 0) throw new Error("MODULES_CONFIG_EMPTY");
        await tx.zProject.update({ where: { id: project.id }, data: { enabledFeatures } });
      }
      if (kind === "SETTINGS") await tx.zProject.update({ where: { id: project.id }, data: { settings: afterConfig } });
      await tx.zWorkspaceConfigProposal.update({ where: { id: proposal.id }, data: { status: "APPLIED", appliedById: user.id, appliedAt: new Date(), rollbackVersionId: version.id } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CONFIG_PROPOSAL_APPLIED", entity: "ZWorkspaceConfigProposal", entityId: proposal.id, meta: { projectId: project.id, moduleKey: kind, version: nextVersion, rollbackVersionId: version.id, approvedById: proposal.approvedById, appliedById: user.id } } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROPOSAL_NOT_APPROVED") return { error: "Proposal chưa APPROVED, sai project hoặc đã được xử lý." };
    if (error instanceof Error && error.message === "PROPOSAL_RISK_BLOCKED") return { error: "Proposal risk không hợp lệ; L5 bị chặn." };
    if (error instanceof Error && error.message === "MODULES_CONFIG_EMPTY") return { error: "MODULES proposal phải có enabledFeatures không rỗng." };
    if (error instanceof Error && error.message === "LAYOUT_CONFIG_INVALID") return { error: "LAYOUT phải chứa đúng một lần toàn bộ module available đang bật trong Dự án." };
    if (error instanceof Error && error.message === "PROPOSAL_CONFIG_EMPTY") return { error: "afterConfig phải là object JSON không rỗng." };
    throw error;
  }
  revalidatePath(`/du-an/${project.id}`);
  revalidatePath("/du-an");
  return { ok: true, message: "Đã APPLY proposal thành version ACTIVE mới; version trước được giữ để rollback/audit." };
}

export async function rejectWorkspaceConfigProposalAction(_prev: ConfigProposalActionState, formData: FormData): Promise<ConfigProposalActionState> {
  const projectId = text(formData, "projectId", 80);
  const proposalId = text(formData, "proposalId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const reason = text(formData, "reason", 500);
  const { user, project } = await requireProjectCapability(projectId, "config.manage");
  if (confirmation !== "REJECT") return { error: "Nhập REJECT để xác nhận từ chối proposal." };
  if (reason.length < 10) return { error: "Lý do reject phải có ít nhất 10 ký tự." };
  const result = await prisma.zWorkspaceConfigProposal.updateMany({ where: { id: proposalId, projectId: project.id, targetScope: "PROJECT", status: "DRAFT" }, data: { status: "REJECTED", note: reason } });
  if (result.count !== 1) return { error: "Proposal không tồn tại, sai project hoặc không còn ở DRAFT." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CONFIG_PROPOSAL_REJECTED", entity: "ZWorkspaceConfigProposal", entityId: proposalId, meta: { projectId: project.id, reason } } });
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: "Đã REJECT proposal; không thay đổi cấu hình." };
}
