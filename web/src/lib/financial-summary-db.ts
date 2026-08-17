import { prisma } from "./db";
import { summarizeCase, type FinancialSummary } from "./financial-summary";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Database-backed financial read model.
 *
 * CaseRecord keeps denormalized amounts for sorting and compatibility, but
 * those columns are a snapshot. Any screen that shows money must be able to
 * rebuild the value from CaseService and Payment rows so a legacy import or a
 * missed write cannot make one screen disagree with the case detail page.
 */
type FinancialDb = typeof prisma | Prisma.TransactionClient;

export type CaseFinancialRow = {
  id: string;
  totalAmount: unknown;
  paidAmount: unknown;
  debtAmount: unknown;
  voucherAmount: unknown;
};

export async function loadCaseFinancials(
  caseIds: readonly string[],
  db: FinancialDb = prisma,
): Promise<Map<string, FinancialSummary>> {
  const ids = [...new Set(caseIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const [cases, services, payments] = await Promise.all([
    db.caseRecord.findMany({
      where: { id: { in: ids } },
      select: { id: true, totalAmount: true, paidAmount: true, debtAmount: true, voucherAmount: true },
    }),
    db.caseService.findMany({
      where: { caseId: { in: ids } },
      select: { caseId: true, listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true },
    }),
    db.payment.findMany({
      where: { caseId: { in: ids } },
      select: { caseId: true, amount: true },
    }),
  ]);

  const serviceMap = new Map<string, typeof services>();
  const paymentMap = new Map<string, typeof payments>();
  for (const service of services) {
    const rows = serviceMap.get(service.caseId) ?? [];
    rows.push(service);
    serviceMap.set(service.caseId, rows);
  }
  for (const payment of payments) {
    const rows = paymentMap.get(payment.caseId) ?? [];
    rows.push(payment);
    paymentMap.set(payment.caseId, rows);
  }

  return new Map(
    (cases as CaseFinancialRow[]).map((record) => [
      record.id,
      summarizeCase({
        services: serviceMap.get(record.id) ?? [],
        payments: paymentMap.get(record.id) ?? [],
        voucherAmount: record.voucherAmount,
        snapshot: record,
      }),
    ]),
  );
}
