import { subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { findFinancialIssues } from "@/lib/financial-health";

export async function getFinancialHealthIssues(limit = 100) {
  const cases = await prisma.caseRecord.findMany({
    where: { updatedAt: { gte: subDays(new Date(), 180) } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      code: true,
      voucherAmount: true,
      totalAmount: true,
      paidAmount: true,
      debtAmount: true,
      customer: { select: { fullName: true } },
      services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
      payments: { select: { amount: true } },
    },
  });
  return findFinancialIssues(cases.map((record) => ({
    caseId: record.id,
    caseCode: record.code,
    customerName: record.customer.fullName,
    voucherAmount: record.voucherAmount,
    snapshot: { totalAmount: record.totalAmount, paidAmount: record.paidAmount, debtAmount: record.debtAmount },
    services: record.services,
    payments: record.payments,
  })));
}
