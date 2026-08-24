"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type WorkspaceTaskActionState = { ok?: boolean; error?: string; message?: string };

const priorities = new Set(["LOW", "NORMAL", "HIGH", "URGENT"] as const);
const statuses = new Set(["TODO", "IN_PROGRESS", "DONE"] as const);

type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function dueAtFromForm(formData: FormData) {
  const raw = text(formData, "dueDate", 10);
  if (!raw) return null;
  const value = new Date(`${raw}T23:59:59`);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

async function assertActiveProjectMember(projectId: string, userId: string) {
  const member = await prisma.zProjectMember.findFirst({ where: { projectId, userId, active: true }, select: { id: true } });
  return Boolean(member);
}

async function validateAssignee(projectId: string, assigneeId: string | null) {
  if (!assigneeId) return true;
  return assertActiveProjectMember(projectId, assigneeId);
}

export async function createWorkspaceTaskAction(_prev: WorkspaceTaskActionState, formData: FormData): Promise<WorkspaceTaskActionState> {
  const projectId = text(formData, "projectId", 80);
  const { user, project } = await requireProjectAccess(projectId);
  if (project.status === "ARCHIVED") return { error: "Dự án đã lưu trữ, không thể tạo Task mới." };

  const title = text(formData, "title", 160);
  const description = text(formData, "description", 5000) || null;
  const rawPriority = text(formData, "priority", 16);
  const priority: TaskPriority = priorities.has(rawPriority as TaskPriority) ? (rawPriority as TaskPriority) : "NORMAL";
  const assigneeId = text(formData, "assigneeId", 80) || null;
  const dueAt = dueAtFromForm(formData);

  if (title.length < 2) return { error: "Tên Task cần ít nhất 2 ký tự." };
  if (dueAt === undefined) return { error: "Ngày hạn không hợp lệ." };
  if (!(await validateAssignee(project.id, assigneeId))) return { error: "Người phụ trách không thuộc thành viên active của Dự án." };

  const maxOrder = await prisma.zWorkspaceTask.aggregate({ where: { projectId: project.id }, _max: { order: true } });
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.zWorkspaceTask.create({
      data: {
        projectId: project.id,
        title,
        description,
        priority,
        dueAt,
        order: (maxOrder._max.order ?? -1) + 1,
        assigneeId,
        createdById: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_WORKSPACE_TASK_CREATED",
        entity: "ZWorkspaceTask",
        entityId: created.id,
        meta: { projectId: project.id, title, priority, assigneeId, dueAt: dueAt?.toISOString() ?? null },
      },
    });
    return created;
  });

  revalidatePath(`/du-an/${project.id}/tasks`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã tạo Task “${task.title}” trong workspace ${project.name}.` };
}

export async function updateWorkspaceTaskStatusAction(_prev: WorkspaceTaskActionState, formData: FormData): Promise<WorkspaceTaskActionState> {
  const projectId = text(formData, "projectId", 80);
  const taskId = text(formData, "taskId", 80);
  const rawStatus = text(formData, "status", 20);
  const { project, user } = await requireProjectAccess(projectId);
  const status: TaskStatus = statuses.has(rawStatus as TaskStatus) ? (rawStatus as TaskStatus) : "TODO";
  if (!taskId) return { error: "Thiếu Task cần cập nhật." };

  const existing = await prisma.zWorkspaceTask.findFirst({ where: { id: taskId, projectId: project.id }, select: { id: true, title: true, status: true } });
  if (!existing) return { error: "Không tìm thấy Task trong workspace này." };

  await prisma.$transaction(async (tx) => {
    await tx.zWorkspaceTask.update({
      where: { id: existing.id },
      data: { status, completedAt: status === "DONE" ? new Date() : null },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_WORKSPACE_TASK_STATUS_UPDATED",
        entity: "ZWorkspaceTask",
        entityId: existing.id,
        meta: { projectId: project.id, from: existing.status, to: status },
      },
    });
  });

  revalidatePath(`/du-an/${project.id}/tasks`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã chuyển “${existing.title}” sang ${status}.` };
}
