"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type ProjectMemberActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function adminOnly(role: string) {
  return role === "ADMIN";
}

export async function addProjectMemberAction(_prev: ProjectMemberActionState, formData: FormData): Promise<ProjectMemberActionState> {
  const projectId = text(formData, "projectId", 80);
  const username = text(formData, "username", 80);
  const preset = text(formData, "preset", 20);
  const { user, project } = await requireProjectAccess(projectId);
  if (!adminOnly(user.role)) return { error: "Chỉ Admin toàn cục mới được quản lý thành viên Dự án." };
  if (!username) return { error: "Nhập username của nhân sự cần thêm." };
  const presetValues = ["PROJECT_ADMIN", "FINANCE", "INVENTORY", "SALES", "VIEWER", "CUSTOM"] as const;
  type ProjectPreset = (typeof presetValues)[number];
  const safePreset: ProjectPreset = presetValues.includes(preset as ProjectPreset) ? (preset as ProjectPreset) : "VIEWER";
  const target = await prisma.user.findFirst({ where: { username, active: true }, select: { id: true, fullName: true, username: true } });
  if (!target) return { error: "Không tìm thấy tài khoản active với username này." };

  await prisma.$transaction(async (tx) => {
    await tx.zProjectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: target.id } },
      create: { projectId: project.id, userId: target.id, preset: safePreset, active: true, leftAt: null },
      update: { preset: safePreset, active: true, leftAt: null },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PROJECT_MEMBER_ADDED", entity: "ZProjectMember", entityId: `${project.id}:${target.id}`, meta: { projectId: project.id, targetUserId: target.id, username: target.username, preset: safePreset } } });
  });

  revalidatePath(`/du-an/${project.id}/thanh-vien`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã cấp ${target.fullName} vào workspace ${project.name}.` };
}

export async function setProjectMemberActiveAction(_prev: ProjectMemberActionState, formData: FormData): Promise<ProjectMemberActionState> {
  const projectId = text(formData, "projectId", 80);
  const memberId = text(formData, "memberId", 80);
  const active = text(formData, "active", 8) === "true";
  const { user, project } = await requireProjectAccess(projectId);
  if (!adminOnly(user.role)) return { error: "Chỉ Admin toàn cục mới được quản lý thành viên Dự án." };
  const member = await prisma.zProjectMember.findFirst({ where: { id: memberId, projectId: project.id }, select: { id: true, userId: true, active: true } });
  if (!member) return { error: "Không tìm thấy membership trong workspace này." };
  if (member.userId === user.id && !active) return { error: "Không thể tự tạm dừng membership của Admin đang thao tác." };

  await prisma.$transaction(async (tx) => {
    await tx.zProjectMember.update({ where: { id: member.id }, data: { active, leftAt: active ? null : new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: active ? "V2_PROJECT_MEMBER_REACTIVATED" : "V2_PROJECT_MEMBER_SUSPENDED", entity: "ZProjectMember", entityId: member.id, meta: { projectId: project.id, targetUserId: member.userId, active } } });
  });

  revalidatePath(`/du-an/${project.id}/thanh-vien`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: active ? "Đã kích hoạt lại thành viên." : "Đã tạm dừng thành viên; dữ liệu cũ được giữ nguyên." };
}
