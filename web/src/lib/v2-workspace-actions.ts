"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";
import { V2_MODULES, normalizedModuleKeys, type V2ModuleKey } from "./v2-modules";

export type ModuleActionState = { ok?: boolean; error?: string; message?: string };

export async function updateProjectModulesAction(_prev: ModuleActionState, formData: FormData): Promise<ModuleActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) return { error: "Thiếu Dự án cần cập nhật." };
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được bật/tắt module của Dự án." };

  const requested = formData.getAll("moduleKey").map(String) as V2ModuleKey[];
  const available = new Set(V2_MODULES.filter((module) => module.available).map((module) => module.key));
  const selected = normalizedModuleKeys(requested).filter((key) => available.has(key));
  if (selected.length === 0) return { error: "Dự án cần giữ ít nhất một module đã triển khai." };

  await prisma.$transaction(async (tx) => {
    await tx.zProject.update({ where: { id: project.id }, data: { enabledFeatures: selected } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_PROJECT_MODULES_UPDATED",
        entity: "ZProject",
        entityId: project.id,
        meta: { enabledFeatures: selected },
      },
    });
  });

  revalidatePath(`/du-an/${project.id}`);
  revalidatePath("/du-an");
  return { ok: true, message: "Đã lưu module của Dự án. Dữ liệu cũ không bị xóa; module chỉ được ẩn/hiện trong workspace." };
}
