/**
 * v2-tenant-extension.ts — Prisma Client Extension cho cách ly Tenant tuyệt đối.
 *
 * Khi `AiPrincipal` có context `PROJECT` với `projectId = X`, Extension sẽ:
 * - Tự động inject `where: { projectId: X }` vào mọi query findMany/findFirst/count/updateMany/deleteMany
 *   trên các bảng có cột `projectId`.
 * - Throw ngay nếu phát hiện AI cố truy cập record thuộc Project khác.
 *
 * Ref: Master Prompt Section XV, XXX — Tenant DB Isolation
 */

import { Prisma } from "@/generated/prisma/client";

// Danh sách các model có cột projectId cần enforce tenant isolation
const TENANT_SCOPED_MODELS = [
  "ZWorkspaceTask",
  "ZWorkspaceCustomer",
  "ZWorkspaceAppointment",
  "ZWorkspaceSale",
  "ZWorkspaceSaleItem",
  "ZWorkspaceFinTransaction",
  "ZProjectMember",
  "ZWorkspaceConfigVersion",
  "ZAiAgent",
] as const;

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isTenantScopedModel(model: string): model is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
}

export type TenantContext = {
  projectId: string;
  /** Nếu true, bypass tenant filter (chỉ dùng cho GLOBAL admin aggregate queries) */
  bypassTenantFilter?: boolean;
};

/**
 * Inject `projectId` filter vào args.where cho các query trên bảng có tenant scope.
 * Nếu caller đã cung cấp projectId trong where, kiểm tra nó PHẢI khớp với context.
 */
export function injectTenantFilter<T extends { where?: Record<string, unknown> }>(
  args: T,
  model: string,
  tenantContext: TenantContext
): T {
  if (!isTenantScopedModel(model)) return args;
  if (tenantContext.bypassTenantFilter) return args;

  const where = (args.where ?? {}) as Record<string, unknown>;

  // Kiểm tra xung đột: nếu caller truyền projectId khác → throw ngay
  if (where.projectId && where.projectId !== tenantContext.projectId) {
    throw new Error(
      `TENANT_ISOLATION_VIOLATION: Attempted to access projectId [${where.projectId}] ` +
      `but current tenant context is [${tenantContext.projectId}]. Query bị chặn tại tầng DB.`
    );
  }

  // Inject filter
  where.projectId = tenantContext.projectId;
  return { ...args, where } as T;
}

/**
 * Kiểm tra record đã fetch có thuộc đúng tenant không.
 * Dùng cho các trường hợp findUnique (không thể inject where projectId).
 */
export function assertRecordBelongsToTenant(
  record: Record<string, unknown> | null,
  tenantContext: TenantContext,
  model: string
): void {
  if (!record) return;
  if (!isTenantScopedModel(model)) return;
  if (tenantContext.bypassTenantFilter) return;

  const recordProjectId = record.projectId;
  if (recordProjectId && recordProjectId !== tenantContext.projectId) {
    throw new Error(
      `TENANT_ISOLATION_VIOLATION: Record belongs to projectId [${recordProjectId}] ` +
      `but current tenant context is [${tenantContext.projectId}]. Access denied.`
    );
  }
}

/**
 * Validate rằng một mutation (create/update) không cố ghi vào project khác.
 */
export function assertMutationTenantSafe(
  data: Record<string, unknown>,
  tenantContext: TenantContext,
  model: string,
  operation: "create" | "update"
): void {
  if (!isTenantScopedModel(model)) return;
  if (tenantContext.bypassTenantFilter) return;

  const dataProjectId = data.projectId;
  if (operation === "create" && !dataProjectId) {
    // Create mà không có projectId → inject tự động
    data.projectId = tenantContext.projectId;
    return;
  }
  if (dataProjectId && dataProjectId !== tenantContext.projectId) {
    throw new Error(
      `TENANT_ISOLATION_VIOLATION: Attempted to ${operation} record in projectId [${dataProjectId}] ` +
      `but current tenant context is [${tenantContext.projectId}]. Mutation bị chặn.`
    );
  }
}
