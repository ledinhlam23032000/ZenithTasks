import { startOfMonth, endOfMonth, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/status";
import { CASH_TYPE, categoryLabel } from "@/lib/finance";
import type { Prisma, CashType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requireCap("mod:thu-chi");
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const typeParam = url.searchParams.get("type");

  const monthRef = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const month = Number.isNaN(monthRef.getTime()) ? new Date() : monthRef;
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const type = typeParam === "INCOME" || typeParam === "EXPENSE" ? (typeParam as CashType) : null;

  const where: Prisma.CashTransactionWhereInput = { occurredAt: { gte: from, lte: to }, ...(type ? { type } : {}) };
  const txs = await prisma.cashTransaction.findMany({
    where,
    orderBy: { occurredAt: "asc" },
    include: { createdBy: { select: { fullName: true } } },
  });

  const header = ["Ngày", "Loại", "Hạng mục", "Số tiền (VND)", "Hình thức", "Nguồn/NCC", "Ghi chú", "Người nhập"];
  const rows = txs.map((t) => [
    format(t.occurredAt, "dd/MM/yyyy"),
    CASH_TYPE[t.type].label,
    categoryLabel(t.category),
    toNum(t.amount),
    PAYMENT_LABEL[t.method],
    t.vendor ?? "",
    t.note ?? "",
    t.createdBy?.fullName ?? "",
  ]);
  // BOM (﻿) để Excel hiển thị đúng tiếng Việt
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="thu-chi-${format(month, "yyyy-MM")}.csv"`,
    },
  });
}
