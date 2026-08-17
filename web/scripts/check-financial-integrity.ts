import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { summarizeCase } from "../src/lib/financial-summary";
import { toNum } from "../src/lib/money";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cases = await prisma.caseRecord.findMany({
    select: {
      id: true,
      code: true,
      totalAmount: true,
      paidAmount: true,
      debtAmount: true,
      voucherAmount: true,
      services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
      payments: { select: { amount: true } },
    },
  });
  const mismatches = cases.flatMap((record) => {
    const summary = summarizeCase(record);
    const actual = [toNum(record.totalAmount), toNum(record.paidAmount), toNum(record.debtAmount)];
    const expected = [summary.total, summary.paid, summary.debt];
    return actual.every((value, index) => value === expected[index]) ? [] : [{ code: record.code, actual, expected }];
  });
  const anomalies = cases.flatMap((record) => {
    const summary = summarizeCase(record);
    return summary.anomalies.length > 0 ? [{ code: record.code, anomalies: summary.anomalies }] : [];
  });
  const negativeStock = await prisma.material.count({ where: { stock: { lt: 0 } } });
  const result = { cases: cases.length, mismatches, anomalies, negativeStock };
  console.log(JSON.stringify(result, null, 2));
  if (mismatches.length > 0 || anomalies.length > 0 || negativeStock > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
