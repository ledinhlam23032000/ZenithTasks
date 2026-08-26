"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type PayrollGovernanceState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function previewWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được chuyển PayrollRun sang PREVIEW." };
  if (confirmation !== "PREVIEW") return { error: "Nhập PREVIEW để xác nhận bước xem trước." };
  const result = await prisma.zWorkspacePayrollRun.updateMany({ where: { id: runId, projectId: project.id, status: "DRAFT" }, data: { status: "PREVIEW" } });
  if (result.count !== 1) return { error: "PayrollRun không ở DRAFT hoặc không thuộc Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_PREVIEWED", entity: "ZWorkspacePayrollRun", entityId: runId, meta: { projectId: project.id } } });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã chuyển PayrollRun sang PREVIEW. Chưa phê duyệt, chưa finalize, chưa chi trả." };
}

export async function approveWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được phê duyệt PayrollRun." };
  if (confirmation !== "APPROVE") return { error: "Nhập APPROVE để xác nhận phê duyệt bản preview." };
  const run = await prisma.zWorkspacePayrollRun.findFirst({ where: { id: runId, projectId: project.id, status: "PREVIEW" }, select: { id: true, lines: { select: { grossAmount: true, commissionAmount: true, deductionAmount: true, netAmount: true } } } });
  if (!run) return { error: "PayrollRun không ở PREVIEW hoặc không thuộc Dự án này." };
  if (run.lines.length === 0) return { error: "PayrollRun chưa có line snapshot." };
  if (run.lines.some((line) => Number(line.grossAmount) < 0 || Number(line.commissionAmount) < 0 || Number(line.deductionAmount) < 0 || Number(line.netAmount) < 0)) return { error: "Phát hiện số tiền âm; chưa cho phép phê duyệt." };
  await prisma.$transaction(async (tx) => {
    await tx.zWorkspacePayrollRun.update({ where: { id: run.id }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_APPROVED", entity: "ZWorkspacePayrollRun", entityId: run.id, meta: { projectId: project.id, lineCount: run.lines.length } } });
  });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã APPROVED bản preview. Finalize/chi trả vẫn bị khóa ở bước riêng." };
}
