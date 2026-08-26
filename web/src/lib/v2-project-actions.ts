"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { PROJECT_TYPES, type ProjectType } from "./v2-project-types";
import { V2_DEFAULT_MODULE_KEYS } from "./v2-modules";

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
        status: "ACTIVE",
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
  return { ok: true, message: `Đã tạo Dự án ${project.code} ở trạng thái ACTIVE. Dự án là workspace vận hành riêng; hãy mở cấu hình để bật các module đã triển khai.` };
}

export async function listV2ProjectCodes() {
  const user = await requireUser(["ADMIN", "MANAGER"]);
  if (process.env.ENABLE_ZENITH_V2 !== "true") return [];
  return prisma.zProject.findMany({ where: user.role === "ADMIN" ? undefined : { members: { some: { userId: user.id, active: true } } }, select: { id: true, code: true, name: true }, orderBy: { updatedAt: "desc" } });
}

