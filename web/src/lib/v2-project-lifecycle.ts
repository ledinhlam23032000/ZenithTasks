/**
 * v2-project-lifecycle.ts — Vòng đời tổ chức: Archive over Delete.
 *
 * Ref: Master Prompt Section XL
 *
 * Trạng thái: DRAFT → ACTIVE → SUSPENDED → ARCHIVED
 * Không bao giờ xóa tổ chức. Chỉ chuyển sang ARCHIVED.
 * Tổ chức ARCHIVED bị block toàn bộ mutation (POST/PUT/DELETE).
 */

export type ProjectLifecycle = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type ProjectLifecycleTransition = {
  from: ProjectLifecycle;
  to: ProjectLifecycle;
  ok: boolean;
  reason?: string;
};

const VALID_TRANSITIONS: Record<ProjectLifecycle, ProjectLifecycle[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["SUSPENDED", "ARCHIVED"],
  SUSPENDED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [], // Terminal state — không thể chuyển đi nơi khác
};

export function validateLifecycleTransition(
  from: ProjectLifecycle,
  to: ProjectLifecycle
): ProjectLifecycleTransition {
  if (from === to) {
    return { from, to, ok: false, reason: "SAME_STATE" };
  }
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    return {
      from,
      to,
      ok: false,
      reason: `INVALID_TRANSITION: Không thể chuyển từ ${from} sang ${to}. Trạng thái cho phép: [${VALID_TRANSITIONS[from]?.join(", ") || "không có"}]`,
    };
  }
  return { from, to, ok: true };
}

/**
 * Kiểm tra tổ chức có cho phép mutation (write) không.
 * Chỉ ACTIVE cho phép tất cả mutation.
 * DRAFT cho phép setup mutations (thêm member, cấu hình module).
 * SUSPENDED và ARCHIVED chặn hoàn toàn.
 */
export type MutationGuardResult = {
  allowed: boolean;
  reason?: string;
  lifecycle: ProjectLifecycle;
};

export function guardProjectMutation(
  lifecycle: ProjectLifecycle,
  operation: "CREATE" | "UPDATE" | "DELETE"
): MutationGuardResult {
  if (lifecycle === "ACTIVE") {
    return { allowed: true, lifecycle };
  }
  if (lifecycle === "DRAFT") {
    // DRAFT cho phép setup: tạo member, cấu hình, nhưng không cho nghiệp vụ chính
    if (operation === "DELETE") {
      return { allowed: false, reason: "DRAFT_NO_DELETE", lifecycle };
    }
    return { allowed: true, lifecycle };
  }
  if (lifecycle === "SUSPENDED") {
    return {
      allowed: false,
      reason: `PROJECT_SUSPENDED: Tổ chức đang tạm ngưng. Liên hệ Admin để kích hoạt lại trước khi thao tác.`,
      lifecycle,
    };
  }
  // ARCHIVED
  return {
    allowed: false,
    reason: `PROJECT_ARCHIVED: Tổ chức đã lưu trữ. Mọi thao tác ghi bị chặn vĩnh viễn. Dữ liệu chỉ đọc.`,
    lifecycle,
  };
}
