"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type WorkspaceCustomerActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createWorkspaceCustomerAction(
  _prev: WorkspaceCustomerActionState,
  formData: FormData,
): Promise<WorkspaceCustomerActionState> {
  const projectId = text(formData, "projectId", 80);
  const { user, project } = await requireProjectAccess(projectId);
  if (project.status === "ARCHIVED") return { error: "Dự án đã lưu trữ, không thể tạo khách hàng mới." };

  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const fullName = text(formData, "fullName", 160);
  const phoneLast4 = text(formData, "phoneLast4", 4);
  const source = text(formData, "source", 80) || null;
  const note = text(formData, "note", 2000) || null;

  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) return { error: "Mã khách cần 3–48 ký tự, dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới." };
  if (fullName.length < 2) return { error: "Họ tên khách cần ít nhất 2 ký tự." };
  if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) return { error: "Chỉ nhập đúng 4 số cuối điện thoại; không nhập số điện thoại đầy đủ." };

  const existing = await prisma.zWorkspaceCustomer.findUnique({
    where: { projectId_code: { projectId: project.id, code } },
    select: { id: true },
  });
  if (existing) return { error: `Mã khách ${code} đã tồn tại trong Dự án này.` };

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.zWorkspaceCustomer.create({
      data: { projectId: project.id, code, fullName, phoneLast4: phoneLast4 || null, source, note, createdById: user.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_WORKSPACE_CUSTOMER_CREATED",
        entity: "ZWorkspaceCustomer",
        entityId: created.id,
        meta: { projectId: project.id, code, fullName, phoneLast4: phoneLast4 || null },
      },
    });
    return created;
  });

  revalidatePath(`/du-an/${project.id}/khach-hang`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã tạo hồ sơ ${customer.code} trong workspace ${project.name}.` };
}


export async function updateWorkspaceCustomerAction(_prev: WorkspaceCustomerActionState, formData: FormData): Promise<WorkspaceCustomerActionState> {
  const projectId = text(formData, "projectId", 80);
  const customerId = text(formData, "customerId", 80);
  const { user, project } = await requireProjectAccess(projectId);
  if (project.status === "ARCHIVED") return { error: "Dự án đã lưu trữ, không thể sửa khách hàng." };
  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const fullName = text(formData, "fullName", 160);
  const phoneLast4 = text(formData, "phoneLast4", 4);
  const source = text(formData, "source", 80) || null;
  const note = text(formData, "note", 2000) || null;
  if (!customerId) return { error: "Thiếu mã hồ sơ project-local." };
  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) return { error: "Mã khách không hợp lệ." };
  if (fullName.length < 2) return { error: "Họ tên khách cần ít nhất 2 ký tự." };
  if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) return { error: "Chỉ nhập đúng 4 số cuối điện thoại." };
  const existing = await prisma.zWorkspaceCustomer.findFirst({ where: { projectId: project.id, code, id: { not: customerId } }, select: { id: true } });
  if (existing) return { error: `Mã khách ${code} đã tồn tại trong Dự án này.` };
  const result = await prisma.zWorkspaceCustomer.updateMany({ where: { id: customerId, projectId: project.id, active: true }, data: { code, fullName, phoneLast4: phoneLast4 || null, source, note } });
  if (result.count !== 1) return { error: "Không tìm thấy hồ sơ active trong Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CUSTOMER_UPDATED", entity: "ZWorkspaceCustomer", entityId: customerId, meta: { projectId: project.id, code } } });
  revalidatePath(`/du-an/${project.id}/khach-hang`);
  revalidatePath(`/du-an/${project.id}/khach-hang/${customerId}`);
  return { ok: true, message: `Đã cập nhật hồ sơ ${code}.` };
}

export async function recordWorkspaceCustomerConsentAction(_prev: WorkspaceCustomerActionState, formData: FormData): Promise<WorkspaceCustomerActionState> {
  const projectId = text(formData, "projectId", 80);
  const customerId = text(formData, "customerId", 80);
  const consentStatus = text(formData, "consentStatus", 32).toUpperCase();
  const consentNote = text(formData, "consentNote", 1000) || null;
  const { user, project } = await requireProjectAccess(projectId);
  if (!["GRANTED", "REFUSED", "PENDING"].includes(consentStatus)) return { error: "Trạng thái consent không hợp lệ." };
  const result = await prisma.zWorkspaceCustomer.updateMany({ where: { id: customerId, projectId: project.id, active: true }, data: { consentStatus, consentedAt: new Date(), consentNote } });
  if (result.count !== 1) return { error: "Không tìm thấy hồ sơ active trong Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CUSTOMER_CONSENT_RECORDED", entity: "ZWorkspaceCustomer", entityId: customerId, meta: { projectId: project.id, consentStatus } } });
  revalidatePath(`/du-an/${project.id}/khach-hang`);
  revalidatePath(`/du-an/${project.id}/khach-hang/${customerId}`);
  return { ok: true, message: `Đã ghi consent ${consentStatus} trong Dự án.` };
}

export async function archiveWorkspaceCustomerAction(_prev: WorkspaceCustomerActionState, formData: FormData): Promise<WorkspaceCustomerActionState> {
  const projectId = text(formData, "projectId", 80);
  const customerId = text(formData, "customerId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId);
  if (confirmation !== "ARCHIVE") return { error: "Nhập ARCHIVE để xác nhận tạm dừng hồ sơ." };
  const result = await prisma.zWorkspaceCustomer.updateMany({ where: { id: customerId, projectId: project.id, active: true }, data: { active: false, deletedAt: new Date(), deletedById: user.id } });
  if (result.count !== 1) return { error: "Không tìm thấy hồ sơ active trong Dự án này." };
  await prisma.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_CUSTOMER_ARCHIVED", entity: "ZWorkspaceCustomer", entityId: customerId, meta: { projectId: project.id, destructiveDelete: false } } });
  revalidatePath(`/du-an/${project.id}/khach-hang`);
  revalidatePath(`/du-an/${project.id}/khach-hang/${customerId}`);
  return { ok: true, message: "Đã tạm dừng hồ sơ; dữ liệu và lịch sử vẫn được giữ." };
}
