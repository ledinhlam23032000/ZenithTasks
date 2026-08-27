"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectCapability } from "./v2-access";

export type ReconciliationActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function positiveAmount(value: string) {
  const normalized = value.replace(/[,\s]/g, "");
  if (!/^\d{1,14}$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export async function createWorkspaceReconciliationAction(_prev: ReconciliationActionState, formData: FormData): Promise<ReconciliationActionState> {
  const projectId = text(formData, "projectId", 80);
  const paymentRef = text(formData, "paymentRef", 120);
  const saleId = text(formData, "saleId", 80) || null;
  const ledgerEntryId = text(formData, "ledgerEntryId", 80) || null;
  const note = text(formData, "note", 300) || null;
  const amount = positiveAmount(text(formData, "amount", 20));
  const { user, project } = await requireProjectCapability(projectId, "finance.manage", { activeOnly: true });
  if (paymentRef.length < 3) return { error: "Payment reference cần ít nhất 3 ký tự." };
  if (amount === null) return { error: "Số tiền đối soát phải là số nguyên dương tối đa 14 chữ số." };

  const duplicate = await prisma.zWorkspacePaymentReconciliation.findUnique({ where: { projectId_paymentRef: { projectId: project.id, paymentRef } }, select: { id: true } });
  if (duplicate) return { error: `Payment reference ${paymentRef} đã tồn tại trong Dự án này.` };
  if (saleId) {
    const sale = await prisma.zWorkspaceSale.findFirst({ where: { id: saleId, projectId: project.id }, select: { id: true } });
    if (!sale) return { error: "Sale không thuộc Dự án hiện tại." };
  }
  if (ledgerEntryId) {
    const ledger = await prisma.zWorkspaceLedgerEntry.findFirst({ where: { id: ledgerEntryId, projectId: project.id, status: "POSTED" }, select: { id: true } });
    if (!ledger) return { error: "Ledger không thuộc Dự án hiện tại hoặc đã void." };
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.zWorkspacePaymentReconciliation.create({ data: { projectId: project.id, saleId, ledgerEntryId, paymentRef, amount, note } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_RECONCILIATION_CREATED", entity: "ZWorkspacePaymentReconciliation", entityId: created.id, meta: { projectId: project.id, paymentRef, amount, saleId, ledgerEntryId } } });
  });
  revalidatePath(`/du-an/${project.id}/tai-chinh`);
  return { ok: true, message: `Đã ghi payment reference ${paymentRef} ở trạng thái UNMATCHED.` };
}

export async function matchWorkspaceReconciliationAction(_prev: ReconciliationActionState, formData: FormData): Promise<ReconciliationActionState> {
  const projectId = text(formData, "projectId", 80);
  const reconciliationId = text(formData, "reconciliationId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectCapability(projectId, "finance.manage", { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được xác nhận đối soát." };
  if (confirmation !== "MATCH") return { error: "Nhập MATCH để xác nhận đối soát." };

  const result = await prisma.zWorkspacePaymentReconciliation.updateMany({ where: { id: reconciliationId, projectId: project.id, status: "UNMATCHED" }, data: { status: "MATCHED", matchedAt: new Date(), matchedById: user.id } });
  if (result.count !== 1) return { error: "Bản ghi không tồn tại, đã đối soát hoặc không thuộc Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_RECONCILIATION_MATCHED", entity: "ZWorkspacePaymentReconciliation", entityId: reconciliationId, meta: { projectId: project.id } } });
  revalidatePath(`/du-an/${project.id}/tai-chinh`);
  return { ok: true, message: "Đã chuyển bản ghi sang MATCHED và lưu audit." };
}


export async function exceptionWorkspaceReconciliationAction(_prev: ReconciliationActionState, formData: FormData): Promise<ReconciliationActionState> {
  const projectId = text(formData, "projectId", 80);
  const reconciliationId = text(formData, "reconciliationId", 80);
  const confirmation = text(formData, "confirmation", 24).toUpperCase();
  const reason = text(formData, "reason", 500);
  const { user, project } = await requireProjectCapability(projectId, "finance.manage", { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được đánh dấu ngoại lệ đối soát." };
  if (confirmation !== "EXCEPTION") return { error: "Nhập EXCEPTION để xác nhận ngoại lệ." };
  if (reason.length < 10) return { error: "Lý do ngoại lệ phải có ít nhất 10 ký tự." };
  const result = await prisma.zWorkspacePaymentReconciliation.updateMany({ where: { id: reconciliationId, projectId: project.id, status: "UNMATCHED" }, data: { status: "EXCEPTION", note: reason } });
  if (result.count !== 1) return { error: "Bản ghi không tồn tại, đã xử lý hoặc không thuộc Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_RECONCILIATION_EXCEPTION", entity: "ZWorkspacePaymentReconciliation", entityId: reconciliationId, meta: { projectId: project.id, reason } } });
  revalidatePath(`/du-an/${project.id}/tai-chinh`);
  return { ok: true, message: "Đã đánh dấu EXCEPTION và lưu lý do/audit; chưa khớp thanh toán." };
}
