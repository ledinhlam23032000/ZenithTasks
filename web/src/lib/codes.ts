import { prisma } from "@/lib/db";
import { nextSeq } from "@/lib/seq";

export { nextSeq, isUniqueViolation } from "@/lib/seq";

/** Sinh mã khách hàng dạng KH00001 (không trùng kể cả sau khi xóa). */
export async function nextCustomerCode(): Promise<string> {
  const rows = await prisma.customer.findMany({ select: { code: true } });
  return `KH${String(nextSeq(rows.map((r) => r.code), "KH")).padStart(5, "0")}`;
}

/** Sinh mã hồ sơ điều trị dạng HS00001 (không trùng kể cả sau khi xóa). */
export async function nextCaseCode(): Promise<string> {
  const rows = await prisma.caseRecord.findMany({ select: { code: true } });
  return `HS${String(nextSeq(rows.map((r) => r.code), "HS")).padStart(5, "0")}`;
}
