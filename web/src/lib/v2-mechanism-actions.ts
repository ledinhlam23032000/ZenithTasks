"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireProjectAccess } from "./v2-access";

export type MechanismActionState = { ok?: boolean; error?: string; message?: string };
type MechanismKind = "COMMISSION" | "DISCOUNT" | "REVENUE_SHARE" | "BONUS" | "RANK" | "OTHER";
const mechanismKinds = new Set<MechanismKind>(["COMMISSION", "DISCOUNT", "REVENUE_SHARE", "BONUS", "RANK", "OTHER"]);

function text(formData: FormData, key: string, max: number) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function parseJsonObject(raw: string) {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function createWorkspaceMechanismAction(_prev: MechanismActionState, formData: FormData): Promise<MechanismActionState> {
  const projectId = text(formData, "projectId", 80);
  const code = text(formData, "code", 48).toUpperCase().replace(/\s+/g, "-");
  const name = text(formData, "name", 120);
  const kind = text(formData, "kind", 32);
  const ruleSpec = parseJsonObject(text(formData, "ruleSpec", 4000));
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được tạo cơ chế project-local." };
  if (!/^[A-Z0-9][A-Z0-9_-]{2,47}$/.test(code)) return { error: "Mã cơ chế không hợp lệ." };
  if (name.length < 2) return { error: "Tên cơ chế cần ít nhất 2 ký tự." };
  if (!ruleSpec) return { error: "ruleSpec phải là JSON object hợp lệ." };
  if (!mechanismKinds.has(kind as MechanismKind)) return { error: "Loại cơ chế không hợp lệ." };
  const mechanismKind = kind as MechanismKind;

  const existing = await prisma.zMechanismDefinition.findUnique({ where: { projectId_code: { projectId: project.id, code } }, select: { id: true } });
  if (existing) return { error: `Mã cơ chế ${code} đã tồn tại trong Dự án này.` };
  await prisma.$transaction(async (tx) => {
    const mechanism = await tx.zMechanismDefinition.create({ data: { projectId: project.id, code, name, kind: mechanismKind, status: "DRAFT" } });
    await tx.zMechanismVersion.create({ data: { definitionId: mechanism.id, version: 1, status: "DRAFT", inputSchema: { type: "object" }, ruleSpec, createdById: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_MECHANISM_DRAFT_CREATED", entity: "ZMechanismDefinition", entityId: mechanism.id, meta: { projectId: project.id, code, version: 1 } } });
  });
  revalidatePath(`/du-an/${project.id}/co-che`);
  return { ok: true, message: `Đã tạo cơ chế ${code} ở DRAFT. Chưa áp dụng cho dữ liệu.` };
}

export async function activateWorkspaceMechanismAction(_prev: MechanismActionState, formData: FormData): Promise<MechanismActionState> {
  const projectId = text(formData, "projectId", 80);
  const versionId = text(formData, "versionId", 80);
  const confirmation = text(formData, "confirmation", 16).toUpperCase();
  const { user, project } = await requireProjectAccess(projectId);
  if (user.role !== "ADMIN") return { error: "Chỉ Admin mới được activate cơ chế." };
  if (confirmation !== "ACTIVATE") return { error: "Nhập ACTIVATE để xác nhận sau khi đã preview ruleSpec." };

  await prisma.$transaction(async (tx) => {
    const version = await tx.zMechanismVersion.findFirst({ where: { id: versionId, definition: { projectId: project.id } }, select: { id: true, definitionId: true, version: true } });
    if (!version) throw new Error("MECHANISM_VERSION_NOT_FOUND");
    await tx.zMechanismVersion.updateMany({ where: { definitionId: version.definitionId, status: "ACTIVE" }, data: { status: "RETIRED", effectiveTo: new Date() } });
    await tx.zMechanismVersion.update({ where: { id: version.id }, data: { status: "ACTIVE", approvedById: user.id, approvedAt: new Date(), effectiveFrom: new Date() } });
    await tx.zMechanismDefinition.update({ where: { id: version.definitionId }, data: { status: "ACTIVE" } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "V2_MECHANISM_ACTIVATED", entity: "ZMechanismVersion", entityId: version.id, meta: { projectId: project.id, definitionId: version.definitionId, version: version.version } } });
  }).catch((error: unknown) => { if (error instanceof Error && error.message === "MECHANISM_VERSION_NOT_FOUND") throw new Error("Không tìm thấy version cơ chế trong Dự án này."); throw error; });

  revalidatePath(`/du-an/${project.id}/co-che`);
  return { ok: true, message: "Đã activate version cơ chế và ghi audit. Hãy kiểm tra rule test trước khi dùng trong payroll." };
}
