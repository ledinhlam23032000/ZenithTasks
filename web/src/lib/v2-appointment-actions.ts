"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type WorkspaceAppointmentActionState = { ok?: boolean; error?: string; message?: string };
const statuses = new Set(["BOOKED", "CONFIRMED", "ARRIVED", "IN_CONSULT", "IN_SERVICE", "DONE", "CANCELLED", "NO_SHOW"] as const);
const types = new Set(["NEW", "FOLLOW_UP", "RE_SERVICE"] as const);
type AppointmentStatus = "BOOKED" | "CONFIRMED" | "ARRIVED" | "IN_CONSULT" | "IN_SERVICE" | "DONE" | "CANCELLED" | "NO_SHOW";
type AppointmentType = "NEW" | "FOLLOW_UP" | "RE_SERVICE";

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function dateTimeFromForm(formData: FormData) {
  const raw = text(formData, "scheduledAt", 40);
  if (!raw) return undefined;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

async function assertActiveMember(projectId: string, userId: string | null) {
  if (!userId) return true;
  return Boolean(await prisma.zProjectMember.findFirst({ where: { projectId, userId, active: true }, select: { id: true } }));
}

export async function createWorkspaceAppointmentAction(
  _prev: WorkspaceAppointmentActionState,
  formData: FormData,
): Promise<WorkspaceAppointmentActionState> {
  const projectId = text(formData, "projectId", 80);
  const { user, project } = await requireProjectAccess(projectId, { activeOnly: true });
  if (project.status === "ARCHIVED") return { error: "Dự án đã lưu trữ, không thể tạo lịch hẹn mới." };

  const customerId = text(formData, "customerId", 80) || null;
  const assignedToId = text(formData, "assignedToId", 80) || null;
  const scheduledAt = dateTimeFromForm(formData);
  const rawType = text(formData, "type", 20);
  const type: AppointmentType = types.has(rawType as AppointmentType) ? (rawType as AppointmentType) : "NEW";
  const serviceInterest = text(formData, "serviceInterest", 160) || null;
  const note = text(formData, "note", 2000) || null;

  if (!scheduledAt) return { error: "Thời gian lịch hẹn không hợp lệ." };
  if (!(await assertActiveMember(project.id, assignedToId))) return { error: "Người phụ trách không thuộc thành viên active của Dự án." };
  if (customerId) {
    const customer = await prisma.zWorkspaceCustomer.findFirst({ where: { id: customerId, projectId: project.id, active: true }, select: { id: true } });
    if (!customer) return { error: "Khách hàng không thuộc workspace này hoặc đã tạm dừng." };
  }
  if (assignedToId) {
    const start = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
    const end = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
    const conflict = await prisma.zWorkspaceAppointment.findFirst({
      where: { projectId: project.id, assignedToId, scheduledAt: { gte: start, lte: end }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { id: true },
    });
    if (conflict) return { error: "Người phụ trách đã có lịch trong khoảng ±30 phút ở workspace này." };
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.zWorkspaceAppointment.create({
      data: { projectId: project.id, customerId, scheduledAt, type, serviceInterest, note, assignedToId, createdById: user.id },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_APPOINTMENT_CREATED", entity: "ZWorkspaceAppointment", entityId: created.id, meta: { projectId: project.id, customerId, scheduledAt: scheduledAt.toISOString(), type, assignedToId } } });
    return created;
  });

  revalidatePath(`/du-an/${project.id}/lich-hen`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã tạo lịch hẹn lúc ${appointment.scheduledAt.toLocaleString("vi-VN")} trong ${project.name}.` };
}

export async function updateWorkspaceAppointmentStatusAction(
  _prev: WorkspaceAppointmentActionState,
  formData: FormData,
): Promise<WorkspaceAppointmentActionState> {
  const projectId = text(formData, "projectId", 80);
  const appointmentId = text(formData, "appointmentId", 80);
  const rawStatus = text(formData, "status", 20);
  const { project, user } = await requireProjectAccess(projectId, { activeOnly: true });
  const status: AppointmentStatus = statuses.has(rawStatus as AppointmentStatus) ? (rawStatus as AppointmentStatus) : "BOOKED";
  if (!appointmentId) return { error: "Thiếu lịch hẹn cần cập nhật." };
  const existing = await prisma.zWorkspaceAppointment.findFirst({ where: { id: appointmentId, projectId: project.id }, select: { id: true, status: true } });
  if (!existing) return { error: "Không tìm thấy lịch hẹn trong workspace này." };
  await prisma.$transaction(async (tx) => {
    await tx.zWorkspaceAppointment.update({ where: { id: existing.id }, data: { status } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_WORKSPACE_APPOINTMENT_STATUS_UPDATED", entity: "ZWorkspaceAppointment", entityId: existing.id, meta: { projectId: project.id, from: existing.status, to: status } } });
  });
  revalidatePath(`/du-an/${project.id}/lich-hen`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã cập nhật trạng thái lịch hẹn thành ${status}.` };
}
