"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { PROJECT_TYPES, type ProjectType } from "./v2-project-types";
import { V2_DEFAULT_MODULE_KEYS } from "./v2-modules";
import { transitionProjectStatus, type ProjectLifecycleStatus } from "./v2-project-lifecycle";

export type ProjectActionState = { ok?: boolean; error?: string; message?: string };

function readText(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

export async function createV2ProjectAction(_prev: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireUser(["ADMIN"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") {
    return { error: "Lớp đa Dự án đang tắt. Hãy bật ENABLE_ZENITH_V2 sau khi đã kiểm tra migration." };
  }

  const code = readText(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const name = readText(formData, "name", 120);
  const description = readText(formData, "description", 500) || null;
  const rawType = readText(formData, "projectType", 32);
  const projectType: ProjectType = PROJECT_TYPES.includes(rawType as ProjectType) ? (rawType as ProjectType) : "OTHER";

  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) {
    return { error: "Mã Dự án cần 3–48 ký tự, dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới." };
  }
  if (name.length < 2) return { error: "Tên Dự án cần ít nhất 2 ký tự." };

  const existing = await prisma.zProject.findUnique({ where: { code }, select: { id: true } });
  if (existing) return { error: `Mã Dự án ${code} đã tồn tại. Hãy chọn mã khác.` };

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.zProject.create({
      data: {
        code,
        name,
        description,
        projectType,
        status: "DRAFT",
        ownerUserId: user.id,
        currency: "VND",
        enabledFeatures: V2_DEFAULT_MODULE_KEYS,
        settings: { demoOnly: false, source: "admin-created" },
      },
    });
    await tx.zProjectMember.create({
      data: { projectId: created.id, userId: user.id, preset: "PROJECT_ADMIN", active: true },
    });
    await tx.zWorkspaceConfigVersion.create({
      data: { projectId: created.id, kind: "MODULES", version: 1, status: "ACTIVE", config: { enabledFeatures: V2_DEFAULT_MODULE_KEYS }, effectiveFrom: new Date(), createdById: user.id, approvedById: user.id, note: "Cấu hình module khởi tạo cùng Dự án" },
    });
    return created;
  });

  revalidatePath("/du-an");
  return { ok: true, message: `Đã tạo Dự án ${project.code} ở trạng thái DRAFT. Hãy cấu hình thành viên và module trước khi kích hoạt vận hành.` };
}

export async function setV2ProjectStatusAction(_prev: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireUser(["ADMIN"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") return { error: "Lớp đa Dự án đang tắt." };
  const projectId = readText(formData, "projectId", 80);
  const targetStatus = readText(formData, "status", 12) as ProjectLifecycleStatus;
  if (!["ACTIVE", "ARCHIVED"].includes(targetStatus)) return { error: "Trạng thái chuyển không hợp lệ." };
  const project = await prisma.zProject.findUnique({ where: { id: projectId }, select: { id: true, code: true, name: true, status: true } });
  if (!project) return { error: "Không tìm thấy Dự án." };
  const transition = transitionProjectStatus(project.status, targetStatus);
  if (!transition.ok) return { error: transition.error };
  if (targetStatus === "ACTIVE") {
    const memberCount = await prisma.zProjectMember.count({ where: { projectId: project.id, active: true } });
    if (memberCount === 0) return { error: "Không thể kích hoạt Dự án chưa có thành viên active." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.zProject.update({ where: { id: project.id }, data: { status: targetStatus } });
    await tx.auditLog.create({ data: { actorId: user.id, action: targetStatus === "ARCHIVED" ? "V2_PROJECT_ARCHIVED" : "V2_PROJECT_ACTIVATED", entity: "ZProject", entityId: project.id, meta: { projectId: project.id, from: project.status, to: targetStatus, reason: readText(formData, "reason", 500) || null } } });
  });
  revalidatePath("/du-an");
  revalidatePath(`/du-an/${project.id}`);
  return { ok: true, message: targetStatus === "ARCHIVED" ? `Đã lưu trữ Dự án ${project.code}. Dữ liệu vẫn được giữ để audit/khôi phục.` : `Đã kích hoạt Dự án ${project.code}.` };
}

export async function listV2ProjectCodes() {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") return [];
  return prisma.zProject.findMany({ where: user.role === "ADMIN" ? undefined : { members: { some: { userId: user.id, active: true } } }, select: { id: true, code: true, name: true }, orderBy: { updatedAt: "desc" } });
}

