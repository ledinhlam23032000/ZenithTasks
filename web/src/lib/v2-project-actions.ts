"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { PROJECT_TYPES, type ProjectType } from "./v2-project-types";
import { V2_DEFAULT_MODULE_KEYS } from "./v2-modules";
import { validateLifecycleTransition, type ProjectLifecycle } from "./v2-project-lifecycle";

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

  const rawModules = formData.getAll("modules").map(String);
  const enabledFeatures = rawModules.length > 0 ? rawModules : V2_DEFAULT_MODULE_KEYS;

  const initialStatus = readText(formData, "initialStatus", 12) === "DRAFT" ? "DRAFT" : "ACTIVE";
  const targetAdminUserId = readText(formData, "adminUserId", 80) || user.id;

  const aiName = readText(formData, "aiName", 120);
  const aiPrompt = readText(formData, "aiPrompt", 2000);

  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) {
    return { error: "Mã Đơn vị cần 3–48 ký tự, dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới." };
  }
  if (name.length < 2) return { error: "Tên Đơn vị cần ít nhất 2 ký tự." };

  const existing = await prisma.zProject.findUnique({ where: { code }, select: { id: true } });
  if (existing) return { error: `Mã Đơn vị ${code} đã tồn tại. Hãy chọn mã khác.` };

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.zProject.create({
      data: {
        code,
        name,
        description,
        projectType,
        status: initialStatus,
        ownerUserId: targetAdminUserId,
        currency: "VND",
        enabledFeatures,
        settings: { demoOnly: false, source: "wizard-created" },
      },
    });

    // Tạo Project Admin
    await tx.zProjectMember.create({
      data: { projectId: created.id, userId: targetAdminUserId, preset: "PROJECT_ADMIN", active: true },
    });
    if (targetAdminUserId !== user.id) {
      await tx.zProjectMember.create({
        data: { projectId: created.id, userId: user.id, preset: "PROJECT_ADMIN", active: true },
      });
    }

    // Ghi nhận phiên bản cấu hình modules
    await tx.zWorkspaceConfigVersion.create({
      data: {
        projectId: created.id,
        kind: "MODULES",
        version: 1,
        status: "ACTIVE",
        config: { enabledFeatures },
        effectiveFrom: new Date(),
        createdById: user.id,
        approvedById: user.id,
        note: "Cấu hình module Lego khởi tạo cùng Đơn vị",
      },
    });

    // 3D: Lego Module Scaffolding - Khởi tạo Seed Data theo Template Industry
    const defaultRoles = projectType === "INTERNAL_CLINIC" 
      ? ["Doctor", "Nurse", "Receptionist", "Clinic Manager"]
      : projectType === "DISTRIBUTION"
      ? ["Sales Representative", "Warehouse Manager", "Delivery Driver", "Accountant"]
      : projectType === "SERVICE"
      ? ["Service Agent", "Technician", "Customer Support", "Manager"]
      : ["Manager", "Staff"];
    
    // Tạo cấu hình Roles mặc định vào ZWorkspaceConfigVersion
    await tx.zWorkspaceConfigVersion.create({
      data: {
        projectId: created.id,
        kind: "ROLES",
        version: 1,
        status: "ACTIVE",
        config: { roles: defaultRoles },
        effectiveFrom: new Date(),
        createdById: user.id,
        approvedById: user.id,
        note: `Cấu hình roles mặc định cho mô hình ${projectType}`,
      },
    });

    // Tự động khởi tạo AI Con (Child AI Agent) nội bộ nếu có tên AI
    if (aiName) {
      const aiCode = `AI-${code}`;
      await tx.zAiAgent.create({
        data: {
          code: aiCode,
          name: aiName,
          kind: "CHILD",
          status: "ACTIVE",
          projectId: created.id,
          createdById: user.id,
          systemPrompt: aiPrompt || `Bạn là trợ lý AI chuyên trách cho đơn vị ${name} (${code}).`,
          model: "gemini-1.5-flash",
          toolAllowlist: [
            "get_project_overview",
            "get_project_customers",
            "get_project_tasks",
            "get_project_sales_summary",
            "get_project_payroll_preview",
          ],
          config: { scope: "PROJECT", projectId: created.id },
          lastHeartbeatAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_PROJECT_CREATED",
        entity: "ZProject",
        entityId: created.id,
        meta: {
          code: created.code,
          name: created.name,
          projectType,
          status: initialStatus,
          modulesCount: enabledFeatures.length,
          hasAiAgent: Boolean(aiName),
        },
      },
    });

    return created;
  });

  revalidatePath("/du-an");
  return {
    ok: true,
    message: `Đã khởi tạo thành công Đơn vị ${project.code} (${project.name}) ở trạng thái ${project.status}!`,
  };
}


export async function setV2ProjectStatusAction(_prev: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireUser(["ADMIN"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") return { error: "Lớp đa Dự án đang tắt." };
  const projectId = readText(formData, "projectId", 80);
  const targetStatus = readText(formData, "status", 12) as ProjectLifecycle;
  if (!["ACTIVE", "ARCHIVED"].includes(targetStatus)) return { error: "Trạng thái chuyển không hợp lệ." };
  const project = await prisma.zProject.findUnique({ where: { id: projectId }, select: { id: true, code: true, name: true, status: true } });
  if (!project) return { error: "Không tìm thấy Dự án." };
  const transition = validateLifecycleTransition(project.status as ProjectLifecycle, targetStatus);
  if (!transition.ok) return { error: transition.reason };
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

