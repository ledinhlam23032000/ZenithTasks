// ============================================================================
// LẬP KẾ HOẠCH (Trợ Lý) — vai trò được dùng + trạng thái nhiệm vụ + tính tiến độ.
// Toán THUẦN, có test. Xem lib/permissions.ts (mod:ke-hoach) cho ranh giới quyền.
// ============================================================================

import type { Role } from "@/generated/prisma/client";
import type { Tone } from "@/components/ui/badge";

/** Vai trò được dùng tính năng Lập kế hoạch — CHỈ 3 vai trò này, Cổ đông toàn quyền (ngoại lệ). */
export const PLAN_ROLES: Role[] = ["ADMIN", "MANAGER", "SHAREHOLDER"];

export type PlanTaskStatusKey = "TODO" | "IN_PROGRESS" | "DONE";

export const PLAN_TASK_STATUS_LABEL: Record<PlanTaskStatusKey, string> = {
  TODO: "Chưa làm",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
};

export const PLAN_TASK_STATUS_TONE: Record<PlanTaskStatusKey, Tone> = {
  TODO: "slate",
  IN_PROGRESS: "amber",
  DONE: "green",
};

export type PlanOverallStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export const PLAN_STATUS_LABEL: Record<PlanOverallStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
};

export const PLAN_STATUS_TONE: Record<PlanOverallStatus, Tone> = {
  NOT_STARTED: "slate",
  IN_PROGRESS: "amber",
  DONE: "green",
};

export type PlanProgress = { total: number; done: number; percent: number; status: PlanOverallStatus };

/** Tiến độ từ 1 danh sách phẳng nhiệm vụ (dùng chung cho cả 1 kế hoạch lẫn 1 nhiệm vụ chính + con). */
export function planProgress(items: Array<{ status: PlanTaskStatusKey }>): PlanProgress {
  const total = items.length;
  const done = items.filter((i) => i.status === "DONE").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const status: PlanOverallStatus = total === 0 || done === 0 ? "NOT_STARTED" : done === total ? "DONE" : "IN_PROGRESS";
  return { total, done, percent, status };
}

/** Sắp xếp theo `order` (không đổi mảng gốc). */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/** Bật/tắt hoàn thành (dùng cho checkbox nhiệm vụ — chỉ 2 trạng thái người dùng bấm trực tiếp). */
export function toggleTaskStatus(current: PlanTaskStatusKey): PlanTaskStatusKey {
  return current === "DONE" ? "TODO" : "DONE";
}
