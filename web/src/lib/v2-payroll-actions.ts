"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type PayrollActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function dateOnly(raw: string) {
  const date = new Date(`${raw}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(date.getTime()) ? date : null;
}

export async function createWorkspacePayrollRunAction(_prev: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  const projectId = text(formData, "projectId", 80);
  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const periodStart = dateOnly(text(formData, "periodStart", 10));
  const periodEnd = dateOnly(text(formData, "periodEnd", 10));
  const mechanismVersionId = text(formData, "mechanismVersionId", 80) || null;
  const note = text(formData, "note", 400) || null;
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được tạo PayrollRun project-local." };
  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) return { error: "Mã kỳ lương không hợp lệ." };
  if (!periodStart || !periodEnd || periodStart > periodEnd) return { error: "Khoảng kỳ lương không hợp lệ." };

  const existing = await prisma.zWorkspacePayrollRun.findUnique({ where: { projectId_code: { projectId: project.id, code } }, select: { id: true } });
  if (existing) return { error: `Mã kỳ lương ${code} đã tồn tại trong Dự án.` };
  if (!mechanismVersionId) return { error: "Cần chọn mechanism version ACTIVE để snapshot trước khi tạo kỳ lương." };

  const mechanism = await prisma.zMechanismVersion.findFirst({ where: { id: mechanismVersionId, status: "ACTIVE", definition: { projectId: project.id } }, select: { id: true, version: true, ruleSpec: true, definition: { select: { code: true, name: true } } } });
  if (!mechanism) return { error: "Mechanism version không ACTIVE hoặc không thuộc Dự án hiện tại." };
  const mechanismSnapshot = { mechanismId: mechanism.id, version: mechanism.version, code: mechanism.definition.code, name: mechanism.definition.name, ruleSpec: mechanism.ruleSpec } as Prisma.InputJsonValue;
  const members = await prisma.zProjectMember.findMany({ where: { projectId: project.id, active: true }, select: { userId: true } });
  if (members.length === 0) return { error: "Dự án chưa có thành viên active để tạo PayrollRun." };

  await prisma.$transaction(async (tx) => {
    const run = await tx.zWorkspacePayrollRun.create({ data: { projectId: project.id, mechanismVersionId: mechanism.id, code, periodStart, periodEnd, status: "DRAFT", mechanismSnapshot, note, createdById: user.id } });
    for (const member of members) {
      await tx.zWorkspacePayrollLine.create({ data: { runId: run.id, projectId: project.id, userId: member.userId, status: "CALCULATED", grossAmount: 0, commissionAmount: 0, deductionAmount: 0, netAmount: 0, snapshot: { projectId: project.id, userId: member.userId, runCode: code, basis: "PENDING_CALCULATION", mechanismVersionId: mechanism.id } } });
    }
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_DRAFT_CREATED", entity: "ZWorkspacePayrollRun", entityId: run.id, meta: { projectId: project.id, code, memberCount: members.length, mechanismVersionId: mechanism.id, periodStart, periodEnd } } });
  });

  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: `Đã tạo PayrollRun ${code} ở DRAFT với ${members.length} line snapshot. Chưa tính hoặc chốt tiền.` };
}
