import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Ghi nhật ký kiểm toán cho các thao tác nhạy cảm (tiền bạc, xóa dữ liệu, lộ SĐT…).
 * Fire-and-forget: lỗi ghi log KHÔNG làm hỏng thao tác chính.
 */
export async function audit(
  actorId: string | null | undefined,
  action: string,
  opts?: { entity?: string; entityId?: string; meta?: Prisma.InputJsonValue; ip?: string },
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        actorId: actorId ?? null,
        action,
        entity: opts?.entity ?? null,
        entityId: opts?.entityId ?? null,
        meta: opts?.meta,
        ip: opts?.ip ?? null,
      },
    })
    .catch(() => {});
}
