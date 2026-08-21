import type { Role } from "@/generated/prisma/client";
import { effectiveKeys } from "./permissions";

export type PermissionPreset = { role: Role; label: string; description: string };

export const PERMISSION_PRESETS: readonly PermissionPreset[] = [
  { role: "RECEPTION", label: "Lễ tân", description: "Tiếp nhận, lịch hẹn và thu tiền được phép." },
  { role: "TELESALE", label: "Telesale", description: "Tìm khách, gọi lại và điều phối lịch." },
  { role: "CONSULTANT", label: "Tư vấn", description: "Tư vấn hồ sơ và theo dõi khách phụ trách." },
  { role: "DOCTOR", label: "Bác sĩ", description: "Workspace lâm sàng và hồ sơ điều trị." },
  { role: "CARE", label: "CSKH", description: "Hộp thư, SLA và chăm sóc khách hàng." },
  { role: "MANAGER", label: "Quản lý", description: "Điều hành, báo cáo và tài chính theo role." },
  { role: "ADMIN", label: "Quản trị viên", description: "Toàn quyền quản trị theo hard barrier hệ thống." },
];

export function permissionPresetKeys(role: Role): string[] {
  return effectiveKeys({ role });
}

export function permissionDiff(current: Iterable<string>, desired: Iterable<string>) {
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);
  return {
    added: [...desiredSet].filter((key) => !currentSet.has(key)),
    removed: [...currentSet].filter((key) => !desiredSet.has(key)),
  };
}
