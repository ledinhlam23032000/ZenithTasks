"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { hashPassword } from "./auth";
import { requireProjectCapability } from "./v2-access";

export type ProjectMemberActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

const presetValues = ["PROJECT_ADMIN", "FINANCE", "INVENTORY", "SALES", "VIEWER", "CUSTOM"] as const;
type ProjectPreset = (typeof presetValues)[number];

function safePreset(raw: string): ProjectPreset {
  return presetValues.includes(raw as ProjectPreset) ? (raw as ProjectPreset) : "VIEWER";
}

export async function addProjectMemberAction(_prev: ProjectMemberActionState, formData: FormData): Promise<ProjectMemberActionState> {
  const projectId = text(formData, "projectId", 80);
  const username = text(formData, "username", 80);
  const selectedPreset = safePreset(text(formData, "preset", 20));
  const { user, project } = await requireProjectCapability(projectId, "members.manage");
  if (!username) return { error: "Nhập username của nhân sự cần thêm." };
  const target = await prisma.user.findFirst({ where: { username, active: true }, select: { id: true, fullName: true, username: true } });
  if (!target) return { error: "Không tìm thấy tài khoản active với username này." };

  await prisma.$transaction(async (tx) => {
    await tx.zProjectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: target.id } },
      create: { projectId: project.id, userId: target.id, preset: selectedPreset, active: true, leftAt: null },
      update: { preset: selectedPreset, active: true, leftAt: null },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PROJECT_MEMBER_ADDED", entity: "ZProjectMember", entityId: `${project.id}:${target.id}`, meta: { projectId: project.id, targetUserId: target.id, username: target.username, preset: selectedPreset } } });
  });

  revalidatePath(`/du-an/${project.id}/thanh-vien`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã cấp ${target.fullName} vào workspace ${project.name}.` };
}

export async function createProjectMemberAccountAction(_prev: ProjectMemberActionState, formData: FormData): Promise<ProjectMemberActionState> {
  const projectId = text(formData, "projectId", 80);
  const fullName = text(formData, "fullName", 160);
  const username = text(formData, "username", 80).toLowerCase();
  const password = text(formData, "password", 200);
  const selectedPreset = safePreset(text(formData, "preset", 20));
  const { user, project } = await requireProjectCapability(projectId, "members.manage");
  if (fullName.length < 2) return { error: "Họ tên cần ít nhất 2 ký tự." };
  if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(username)) return { error: "Username cần 3–80 ký tự, dùng chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới." };
  if (password.length < 8) return { error: "Mật khẩu khởi tạo cần ít nhất 8 ký tự." };
  const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } }, select: { id: true } });
  if (existing) return { error: "Username đã tồn tại trong hệ thống." };
  const code = `EMP-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { code, fullName, username, passwordHash: await hashPassword(password), role: "COLLABORATOR", mustChangePassword: true, active: true } });
      await tx.zProjectMember.create({ data: { projectId: project.id, userId: created.id, preset: selectedPreset, active: true, leftAt: null } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "V2_PROJECT_MEMBER_ACCOUNT_CREATED", entity: "ZProjectMember", entityId: `${project.id}:${created.id}`, meta: { projectId: project.id, targetUserId: created.id, username, preset: selectedPreset, mustChangePassword: true } } });
    });
  } catch {
    return { error: "Không tạo được account company-local. Kiểm tra username hoặc thử lại." };
  }
  revalidatePath(`/du-an/${project.id}/thanh-vien`);
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: `Đã tạo account ${username} cho ${project.name} với preset ${selectedPreset}. Account phải đổi mật khẩu khi đăng nhập lần đầu.` };
}

export async function setProjectMemberActiveAction(_prev: ProjectMemberActionState, formData: FormData): Promise<ProjectMemberActionState> {
  const projectId = text(formData, "projectId", 80);
  const memberId = text(formData, "memberId", 80);
  const active = text(formData, "active", 8) === "true";
  const { user, project } = await requireProjectCapability(projectId, "members.manage");
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
