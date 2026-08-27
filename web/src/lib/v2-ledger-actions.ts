"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectCapability } from "./v2-access";

export type LedgerActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function amount(formData: FormData) {
  const raw = text(formData, "amount", 20).replace(/[,\s]/g, "");
  if (!/^\d{1,14}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function createWorkspaceLedgerEntryAction(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const projectId = text(formData, "projectId", 80);
  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const direction = text(formData, "direction", 16);
  const category = text(formData, "category", 80);
  const description = text(formData, "description", 500) || null;
  const sourceRef = text(formData, "sourceRef", 120) || null;
  const saleId = text(formData, "saleId", 80) || null;
  const value = amount(formData);
  const occurredAtRaw = text(formData, "occurredAt", 32);

  const { user, project } = await requireProjectCapability(projectId, "finance.manage", { activeOnly: true });
  if (!/[A-Z0-9][A-Z0-9_-]{2,47}/.test(code)) return { error: "Mã ledger cần 3–48 ký tự chữ in hoa, số, gạch ngang hoặc gạch dưới." };
  if (direction !== "INCOME" && direction !== "EXPENSE") return { error: "Chọn đúng hướng INCOME hoặc EXPENSE." };
  if (category.length < 2) return { error: "Nhóm thu/chi cần ít nhất 2 ký tự." };
  if (value === null) return { error: "Số tiền phải là số nguyên dương tối đa 14 chữ số." };
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) return { error: "Thời điểm phát sinh không hợp lệ." };

  const existing = await prisma.zWorkspaceLedgerEntry.findUnique({ where: { projectId_code: { projectId: project.id, code } }, select: { id: true } });
  if (existing) return { error: `Mã ledger ${code} đã tồn tại trong Dự án này.` };
  if (saleId) {
    const sale = await prisma.zWorkspaceSale.findFirst({ where: { id: saleId, projectId: project.id }, select: { id: true } });
    if (!sale) return { error: "Giao dịch doanh số không thuộc Dự án hiện tại." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.zWorkspaceLedgerEntry.create({ data: { projectId: project.id, saleId, code, direction, category, description, sourceRef, amount: value, occurredAt, createdById: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_LEDGER_CREATED", entity: "ZWorkspaceLedgerEntry", entityId: code, meta: { projectId: project.id, direction, category, amount: value, saleId } } });
  });

  revalidatePath(`/du-an/${project.id}/tai-chinh`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã ghi ledger ${code} trong Dự án ${project.code}. Lịch sử không dùng thao tác xóa.` };
}

export async function voidWorkspaceLedgerEntryAction(_prev: LedgerActionState, formData: FormData): Promise<LedgerActionState> {
  const projectId = text(formData, "projectId", 80);
  const entryId = text(formData, "entryId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const reason = text(formData, "reason", 300);
  const { user, project } = await requireProjectCapability(projectId, "finance.manage", { activeOnly: true });
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được void ledger." };
  if (confirmation !== "VOID") return { error: "Nhập VOID để xác nhận; hệ thống không xóa lịch sử." };
  if (reason.length < 5) return { error: "Cần nêu lý do void ít nhất 5 ký tự." };

  const result = await prisma.zWorkspaceLedgerEntry.updateMany({ where: { id: entryId, projectId: project.id, status: "POSTED" }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason } });
  if (result.count !== 1) return { error: "Ledger không tồn tại, đã void hoặc không thuộc Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_LEDGER_VOIDED", entity: "ZWorkspaceLedgerEntry", entityId: entryId, meta: { projectId: project.id, reason } } });
  revalidatePath(`/du-an/${project.id}/tai-chinh`);
  return { ok: true, message: "Đã void ledger và giữ nguyên lịch sử audit." };
}
