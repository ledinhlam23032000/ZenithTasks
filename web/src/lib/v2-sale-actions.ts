"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type WorkspaceSaleActionState = { ok?: boolean; error?: string; message?: string };
const statuses = new Set(["DRAFT", "CONFIRMED", "PAID", "CANCELLED"] as const);
type SaleStatus = "DRAFT" | "CONFIRMED" | "PAID" | "CANCELLED";

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key, 20).replace(/[^0-9]/g, "");
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

export async function createWorkspaceSaleAction(_prev: WorkspaceSaleActionState, formData: FormData): Promise<WorkspaceSaleActionState> {
  const projectId = text(formData, "projectId", 80);
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (project.status === "ARCHIVED") return { error: "Dự án đã lưu trữ, không thể tạo giao dịch mới." };

  const customerId = text(formData, "customerId", 80) || null;
  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const serviceName = text(formData, "serviceName", 160);
  const amount = money(formData, "amount");
  const paidAmount = money(formData, "paidAmount") ?? 0;
  const rawStatus = text(formData, "status", 20);
  const status: SaleStatus = statuses.has(rawStatus as SaleStatus) ? (rawStatus as SaleStatus) : "DRAFT";
  const note = text(formData, "note", 2000) || null;

  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) return { error: "Mã giao dịch cần 3–48 ký tự, dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới." };
  if (serviceName.length < 2) return { error: "Tên dịch vụ cần ít nhất 2 ký tự." };
  if (amount === undefined || amount <= 0) return { error: "Giá trị giao dịch phải là số nguyên dương." };
  if (paidAmount < 0 || paidAmount > amount) return { error: "Số đã thu phải nằm trong khoảng từ 0 đến tổng giá trị." };
  if (status === "PAID" && paidAmount !== amount) return { error: "Giao dịch PAID phải có số đã thu bằng tổng giá trị." };
  if (customerId) {
    const customer = await prisma.zWorkspaceCustomer.findFirst({ where: { id: customerId, projectId: project.id, active: true }, select: { id: true } });
    if (!customer) return { error: "Khách hàng không thuộc workspace này hoặc đã tạm dừng." };
  }
  const existing = await prisma.zWorkspaceSale.findUnique({ where: { projectId_code: { projectId: project.id, code } }, select: { id: true } });
  if (existing) return { error: `Mã giao dịch ${code} đã tồn tại trong Dự án này.` };

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.zWorkspaceSale.create({ data: { projectId: project.id, customerId, code, serviceName, amount, paidAmount, status, note, createdById: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_SALE_CREATED", entity: "ZWorkspaceSale", entityId: created.id, meta: { projectId: project.id, code, customerId, amount, paidAmount, status } } });
    return created;
  });
  revalidatePath(`/du-an/${project.id}/doanh-so`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã ghi giao dịch ${sale.code} trong workspace ${project.name}.` };
}
