import { prisma } from "@/lib/db";

/** Sinh mã khách hàng dạng KH00001. */
export async function nextCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `KH${String(count + 1).padStart(5, "0")}`;
}

/** Sinh mã hồ sơ dạng HS00001. */
export async function nextCaseCode(): Promise<string> {
  const count = await prisma.caseRecord.count();
  return `HS${String(count + 1).padStart(5, "0")}`;
}
