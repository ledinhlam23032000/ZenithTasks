import type { Role } from "@/generated/prisma/client";

export type PromotionSnapshot = {
  role: Role;
  position: string | null;
  department: string | null;
};

export function promotionChanged(current: PromotionSnapshot, next: PromotionSnapshot): boolean {
  return current.role !== next.role || (current.position ?? "") !== (next.position ?? "") || (current.department ?? "") !== (next.department ?? "");
}

export function resolveEffectiveDate(value: string | null | undefined, now = new Date()): Date {
  if (!value) return now;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

export function promotionDiff(current: PromotionSnapshot, next: PromotionSnapshot) {
  return {
    fromRole: current.role,
    toRole: next.role,
    fromPosition: current.position,
    toPosition: next.position,
    fromDepartment: current.department,
    toDepartment: next.department,
  };
}
