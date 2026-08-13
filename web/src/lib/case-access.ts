import type { Role } from "@/generated/prisma/client";
import { userCan } from "./permissions";

export type CaseAccessUser = { id: string; role: Role; permissions?: unknown };
export type CaseAccessRecord = { consultantId: string | null; doctorId: string | null };
export type CaseAccess = "read" | "clinical" | "payment.add" | "payment.manage";

function capabilityFor(access: CaseAccess): string {
  return access === "clinical" ? "case.clinical" : access;
}

/**
 * Scope hồ sơ ở server. Capability chỉ trả lời user có loại thao tác nào;
 * helper này còn buộc user phải thuộc đúng case khi là consultant/doctor.
 */
export function canAccessCase(user: CaseAccessUser, record: CaseAccessRecord, access: CaseAccess): boolean {
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
