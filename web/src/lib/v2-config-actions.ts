"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type ConfigRollbackState = { ok?: boolean; error?: string; message?: string };

function positiveVersion(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function rollbackProjectModulesAction(_prev: ConfigRollbackState, formData: FormData): Promise<ConfigRollbackState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const version = positiveVersion(formData.get("version"));
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (!projectId || !version) return { error: "Thiếu Dự án hoặc version cần khôi phục." };
  if (confirmation !== "ROLLBACK") return { error: "Hãy nhập ROLLBACK để xác nhận khôi phục cấu hình module." };

  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Global Admin mới được khôi phục cấu hình module." };

  await prisma.$transaction(async (tx) => {
    const target = await tx.zWorkspaceConfigVersion.findFirst({
      where: { projectId: project.id, kind: "MODULES", version },
      select: { id: true, version: true, config: true },
    });
    if (!target) throw new Error("CONFIG_VERSION_NOT_FOUND");

    const rawConfig = target.config;
    const config = rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig) ? rawConfig as Prisma.InputJsonValue : null;
    if (!config) throw new Error("CONFIG_VERSION_EMPTY");

    const latest = await tx.zWorkspaceConfigVersion.findFirst({
      where: { projectId: project.id, kind: "MODULES" },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    await tx.zWorkspaceConfigVersion.updateMany({
      where: { projectId: project.id, kind: "MODULES", status: "ACTIVE" },
      data: { status: "SUPERSEDED", effectiveTo: new Date() },
    });
    await tx.zWorkspaceConfigVersion.create({
      data: {
        projectId: project.id,
        kind: "MODULES",
        version: nextVersion,
        status: "ACTIVE",
        config,
        effectiveFrom: new Date(),
        createdById: user.id,
        approvedById: user.id,
        note: `Rollback an to version ${target.version}`,
      },
    });

    const configObject = config as { enabledFeatures?: unknown };
    const enabledFeatures = Array.isArray(configObject.enabledFeatures) ? configObject.enabledFeatures.map(String) : [];
    if (enabledFeatures.length === 0) throw new Error("CONFIG_VERSION_EMPTY");
    await tx.zProject.update({ where: { id: project.id }, data: { enabledFeatures } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "V2_PROJECT_MODULES_ROLLED_BACK",
        entity: "ZProject",
        entityId: project.id,
        meta: { fromVersion: target.version, createdVersion: nextVersion, configKind: "MODULES" },
      },
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "CONFIG_VERSION_NOT_FOUND") throw new Error("Không tìm thấy version module trong Dự án này.");
    if (error instanceof Error && error.message === "CONFIG_VERSION_EMPTY") throw new Error("Version được chọn không có danh sách module hợp lệ.");
    throw error;
  });

  revalidatePath(`/du-an/${project.id}`);
  revalidatePath("/du-an");
  return { ok: true, message: `Đã tạo version ACTIVE mới từ version ${version}. Các version cũ vẫn được giữ nguyên để audit.` };
}
