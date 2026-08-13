import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";

type AuditDb = Prisma.TransactionClient | typeof prisma;

/**
 * Critical mutations use this variant inside the same transaction as the
 * business change. If the audit row cannot be written, the mutation rolls
 * back instead of silently becoming unaudited.
 */
export async function auditRequired(
  db: AuditDb,
  actorId: string | null | undefined,
  action: string,
  opts?: { entity?: string; entityId?: string; meta?: Prisma.InputJsonValue; ip?: string },
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entity: opts?.entity ?? null,
      entityId: opts?.entityId ?? null,
      meta: opts?.meta,
      ip: opts?.ip ?? null,
    },
  });
}

/**
 * Ghi nhật ký kiểm toán cho các thao tác nhạy cảm (tiền bạc, xóa dữ liệu, lộ SĐT…).
 * Fire-and-forget: lỗi ghi log KHÔNG làm hỏng thao tác chính.
 */
export async function audit(
  actorId: string | null | undefined,
  action: string,
  opts?: { entity?: string; entityId?: string; meta?: Prisma.InputJsonValue; ip?: string },
): Promise<void> {
  await auditRequired(prisma, actorId, action, opts).catch(() => {});
}
