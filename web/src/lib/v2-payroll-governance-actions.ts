"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";
import { canVoidPayrollStatus, hasTwoDistinctPayrollApprovals } from "./v2-payroll-policy";

export type PayrollGovernanceState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function previewWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được chuyển PayrollRun sang PREVIEW." };
  if (confirmation !== "PREVIEW") return { error: "Nhập PREVIEW để xác nhận bước xem trước." };
  const run = await prisma.zWorkspacePayrollRun.findFirst({ where: { id: runId, projectId: project.id, status: "DRAFT" }, select: { id: true, lines: { select: { snapshot: true } } } });
  if (!run) return { error: "PayrollRun không ở DRAFT hoặc không thuộc Dự án này." };
  const calculated = run.lines.length > 0 && run.lines.every((line) => !!line.snapshot && typeof line.snapshot === "object" && !Array.isArray(line.snapshot) && "calculation" in line.snapshot);
  if (!calculated) return { error: "Cần CALCULATE thành công trước khi chuyển sang PREVIEW." };
  const result = await prisma.zWorkspacePayrollRun.updateMany({ where: { id: run.id, projectId: project.id, status: "DRAFT" }, data: { status: "PREVIEW" } });
  if (result.count !== 1) return { error: "PayrollRun đã thay đổi trạng thái; tải lại trước khi thao tác." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_PREVIEWED", entity: "ZWorkspacePayrollRun", entityId: runId, meta: { projectId: project.id } } });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã chuyển PayrollRun sang PREVIEW. Chưa phê duyệt, chưa finalize, chưa chi trả." };
}

export async function secondApproveWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 24).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được xác nhận bước thứ hai." };
  if (confirmation !== "APPROVE_SECOND") return { error: "Nhập APPROVE_SECOND để xác nhận độc lập." };
  const run = await prisma.zWorkspacePayrollRun.findFirst({ where: { id: runId, projectId: project.id, status: "APPROVED" }, select: { id: true, approvedById: true, secondApprovedById: true } });
  if (!run) return { error: "PayrollRun chưa ở APPROVED hoặc không thuộc Dự án này." };
  if (!run.approvedById || run.approvedById === user.id) return { error: "Bước second approval phải do Admin khác người phê duyệt đầu tiên thực hiện." };
  if (run.secondApprovedById) return { error: "PayrollRun đã có second approval; không ghi đè lịch sử." };
  await prisma.$transaction(async (tx) => {
    await tx.zWorkspacePayrollRun.update({ where: { id: run.id }, data: { secondApprovedById: user.id, secondApprovedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_SECOND_APPROVED", entity: "ZWorkspacePayrollRun", entityId: run.id, meta: { projectId: project.id, firstApproverId: run.approvedById } } });
  });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã ghi second approval từ Admin khác. Payroll mới đủ điều kiện finalize; chưa chi trả." };
}

export async function finalizeWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được finalize PayrollRun." };
  if (confirmation !== "FINALIZE") return { error: "Nhập FINALIZE để xác nhận chốt kỳ lương." };
  const run = await prisma.zWorkspacePayrollRun.findFirst({ where: { id: runId, projectId: project.id, status: "APPROVED" }, select: { id: true, approvedById: true, secondApprovedById: true } });
  if (!run) return { error: "PayrollRun chưa ở APPROVED hoặc không thuộc Dự án này." };
  if (!hasTwoDistinctPayrollApprovals(run.approvedById, run.secondApprovedById)) return { error: "Chưa đủ hai Admin khác nhau phê duyệt; chưa finalize." };
  await prisma.$transaction(async (tx) => {
    await tx.zWorkspacePayrollRun.update({ where: { id: run.id }, data: { status: "FINALIZED", finalizedById: user.id, finalizedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_FINALIZED", entity: "ZWorkspacePayrollRun", entityId: run.id, meta: { projectId: project.id, firstApproverId: run.approvedById, secondApproverId: run.secondApprovedById, finalizedById: user.id, payoutCreated: false } } });
  });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã FINALIZE kỳ lương sau two-person approval. Chưa tự tạo payout hoặc ghi vào Nội Bộ." };
}

export async function voidWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const reason = text(formData, "reason", 500);
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được void PayrollRun." };
  if (confirmation !== "VOID") return { error: "Nhập VOID để xác nhận hủy kỳ có audit." };
  if (reason.length < 10) return { error: "Lý do void phải có ít nhất 10 ký tự." };
  const run = await prisma.zWorkspacePayrollRun.findFirst({ where: { id: runId, projectId: project.id, status: { in: ["APPROVED", "FINALIZED"] } }, select: { id: true, status: true, approvedById: true, secondApprovedById: true } });
  if (!run) return { error: "Chỉ được void PayrollRun APPROVED/FINALIZED cùng Dự án." };
  if (!canVoidPayrollStatus(run.status) || !hasTwoDistinctPayrollApprovals(run.approvedById, run.secondApprovedById)) return { error: "Void yêu cầu trạng thái hợp lệ và two-person approval trước đó." };
  await prisma.$transaction(async (tx) => {
    await tx.zWorkspacePayrollRun.update({ where: { id: run.id }, data: { status: "VOIDED", voidedById: user.id, voidedAt: new Date(), voidReason: reason } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PAYROLL_RUN_VOIDED", entity: "ZWorkspacePayrollRun", entityId: run.id, meta: { projectId: project.id, previousStatus: run.status, reason, voidedById: user.id } } });
  });
  revalidatePath(`/du-an/${project.id}/luong`);
  return { ok: true, message: "Đã VOID có lý do và audit; dữ liệu không bị xóa, không ghi payout." };
}

export async function approveWorkspacePayrollRunAction(_prev: PayrollGovernanceState, formData: FormData): Promise<PayrollGovernanceState> {
  const projectId = text(formData, "projectId", 80);
  const runId = text(formData, "runId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
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
