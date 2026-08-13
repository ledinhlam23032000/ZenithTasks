import type { Role } from "@/generated/prisma/client";
import { userCan } from "./permissions";
import { prisma } from "./db";

export type CaseAccessUser = { id: string; role: Role; permissions?: unknown };
export type CaseAccessRecord = { consultantId: string | null; doctorId: string | null };
export type CaseCapability = "read" | "clinical" | "payment.add" | "payment.manage";
export type CaseAccess = CaseCapability;
export type AuthorizedCase = {
  id: string;
  customerId: string;
  consultantId: string | null;
  doctorId: string | null;
  locked: boolean;
  archivedAt?: Date | null;
};
export type AuthorizedCaseChild = {
  kind: "caseService" | "materialUsage" | "payment" | "photo" | "followUp";
  id: string;
  caseId: string;
  customerId: string;
};

function capabilityFor(access: CaseAccess): string {
  return access === "clinical" ? "case.clinical" : access;
}

/**
 * Scope hồ sơ ở server. Capability chỉ trả lời user có loại thao tác nào;
 * helper này còn buộc user phải thuộc đúng case khi là consultant/doctor.
 */
export function canAccessCase(user: CaseAccessUser, record: CaseAccessRecord, access: CaseCapability): boolean {
  if (user.role === "ADMIN" || user.role === "MANAGER") {
    return access === "read" || userCan(user, access === "clinical" ? "case.clinical" : access);
  }

  if (access === "payment.manage") return userCan(user, "payment.manage");
  if (access === "read") {
    if (["RECEPTION", "SHAREHOLDER", "CARE"].includes(user.role)) return true;
    if (user.role === "CONSULTANT") return record.consultantId === user.id;
    if (user.role === "DOCTOR") return record.doctorId === user.id;
    return false;
  }

  if (access === "payment.add" && user.role === "RECEPTION") return userCan(user, "payment.add");
  if (user.role === "CONSULTANT") return record.consultantId === user.id && userCan(user, capabilityFor(access));
  if (user.role === "DOCTOR") return record.doctorId === user.id && userCan(user, capabilityFor(access));
  return false;
}

/** Lấy hồ sơ thật từ database và kiểm tra quyền ở server. */
export async function requireCaseAccess(user: CaseAccessUser, caseId: string, capability: CaseCapability): Promise<AuthorizedCase> {
  const record = await prisma.caseRecord.findUnique({
    where: { id: caseId },
    select: { id: true, customerId: true, consultantId: true, doctorId: true, locked: true },
  });
  if (!record || !canAccessCase(user, record, capability)) throw new Error("CASE_FORBIDDEN");
  return record;
}

/**
 * Kiểm tra child record bằng cả childId và caseId. Không tin caseId ẩn trong
 * form, đồng thời không cho một bản ghi con trỏ sang hồ sơ khác.
 */
export async function requireCaseChildAccess(
  user: CaseAccessUser,
  childId: string,
  caseId: string,
  capability: CaseCapability,
): Promise<AuthorizedCaseChild> {
  const parent = await requireCaseAccess(user, caseId, capability);
  const [service, material, payment, photo, followUp] = await Promise.all([
    prisma.caseService.findFirst({ where: { id: childId, caseId }, select: { id: true, caseId: true } }),
    prisma.materialUsage.findFirst({ where: { id: childId, caseId }, select: { id: true, caseId: true } }),
    prisma.payment.findFirst({ where: { id: childId, caseId }, select: { id: true, caseId: true } }),
    prisma.photo.findFirst({ where: { id: childId, caseId }, select: { id: true, caseId: true } }),
    prisma.followUp.findFirst({ where: { id: childId, caseId }, select: { id: true, caseId: true } }),
  ]);
  const match = service
    ? { kind: "caseService" as const, ...service }
    : material
      ? { kind: "materialUsage" as const, ...material }
      : payment
        ? { kind: "payment" as const, ...payment }
        : photo
          ? photo.caseId
            ? { kind: "photo" as const, id: photo.id, caseId: photo.caseId }
            : null
          : followUp
            ? { kind: "followUp" as const, ...followUp }
            : null;
  if (!match) throw new Error("CASE_CHILD_FORBIDDEN");
  return { ...match, customerId: parent.customerId };
}
