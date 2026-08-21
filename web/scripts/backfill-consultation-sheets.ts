import { prisma } from "../src/lib/db";
import { defaultScreening } from "../src/lib/consultation-sheet";
import { auditRequired } from "../src/lib/audit";
import type { Prisma } from "../src/generated/prisma/client";

async function main() {
  const fallbackRequester = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  }) ?? await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  if (!fallbackRequester) {
    console.log("[consultation-backfill] Chưa có tài khoản người dùng; sẽ thử lại lần khởi động sau.");
    return;
  }

  const cases = await prisma.caseRecord.findMany({
    where: { consultation: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      code: true,
      createdById: true,
      chiefComplaint: true,
      createdAt: true,
      services: { select: { name: true, quantity: true, finalPrice: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (cases.length === 0) {
    console.log("[consultation-backfill] Không có hồ sơ cũ nào thiếu Phiếu tư vấn.");
    return;
  }

  let created = 0;
  for (const record of cases) {
    const createdById = record.createdById ?? fallbackRequester.id;
    const serviceSnapshot = record.services.map((service) => ({ name: service.name, quantity: service.quantity, finalPrice: Number(service.finalPrice) }));
    const didCreate = await prisma.$transaction(async (tx) => {
      const current = await tx.consultationRecord.findUnique({ where: { caseId: record.id }, select: { id: true } });
      if (current) return false;
      const consultation = await tx.consultationRecord.create({
        data: {
          caseId: record.id,
          screening: defaultScreening() satisfies Prisma.InputJsonValue,
          wants: record.chiefComplaint || null,
          serviceSnapshot: serviceSnapshot.length > 0 ? serviceSnapshot satisfies Prisma.InputJsonValue : undefined,
          createdById,
        },
      });
      await auditRequired(tx, fallbackRequester.id, "BACKFILL_CONSULTATION_SHEET", {
        entity: "ConsultationRecord",
        entityId: consultation.id,
        meta: { caseId: record.id, caseCode: record.code, requesterFallback: record.createdById === null },
      });
      return true;
    });
    if (didCreate) created++;
  }

  console.log(`[consultation-backfill] Đã tạo ${created}/${cases.length} Phiếu tư vấn mặc định cho hồ sơ cũ.`);
}

main().catch((error) => {
  console.error("[consultation-backfill] Không hoàn tất; ứng dụng vẫn khởi động và sẽ thử lại lần sau.", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
