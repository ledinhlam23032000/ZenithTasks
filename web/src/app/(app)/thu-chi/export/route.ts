import { startOfMonth, endOfMonth, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/status";
import { CASH_TYPE, categoryLabel } from "@/lib/finance";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";
import type { Prisma, CashType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** Xuất sổ thu chi tháng: ?format=xlsx (mặc định) | doc | csv. */
export async function GET(request: Request) {
  await requireCap("mod:thu-chi");
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const typeParam = url.searchParams.get("type");
  const fmt = url.searchParams.get("format") ?? "xlsx";

  const monthRef = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const month = Number.isNaN(monthRef.getTime()) ? new Date() : monthRef;
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const monthLabel = format(month, "MM/yyyy");
  const fileBase = `thu-chi-${format(month, "yyyy-MM")}`;
  const type = typeParam === "INCOME" || typeParam === "EXPENSE" ? (typeParam as CashType) : null;

  const where: Prisma.CashTransactionWhereInput = { occurredAt: { gte: from, lte: to }, ...(type ? { type } : {}) };
  const txs = await prisma.cashTransaction.findMany({
    where,
    orderBy: { occurredAt: "asc" },
    include: { createdBy: { select: { fullName: true } } },
  });

  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "INCOME") income += toNum(t.amount);
    else expense += toNum(t.amount);
  }

  const columns = ["Ngày", "Loại", "Hạng mục", "Số tiền (VND)", "Hình thức", "Nguồn/NCC", "Ghi chú", "Người nhập"];
  const rows: Cell[][] = txs.map((t) => [
    format(t.occurredAt, "dd/MM/yyyy"),
    CASH_TYPE[t.type].label,
    categoryLabel(t.category),
    toNum(t.amount),
    PAYMENT_LABEL[t.method],
    t.vendor ?? "",
    t.note ?? "",
    t.createdBy?.fullName ?? "",
  ]);
  const totalRows: Cell[][] = [
    ["Tổng thu", "", "", income],
    ["Tổng chi", "", "", expense],
    ["Số dư", "", "", income - expense],
  ];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Sổ thu chi tháng ${monthLabel}`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [
        { heading: "Giao dịch", columns, rows },
        { heading: "Tổng kết", columns: ["Khoản mục", "", "", "Số tiền (VND)"], rows: totalRows },
      ],
    });
  }

  if (fmt === "csv") {
    return csvResponse(fileBase, [columns, ...rows, [], ["Tổng thu", "", "", income], ["Tổng chi", "", "", expense], ["Số dư", "", "", income - expense]]);
  }

  return xlsxResponse(fileBase, [
    {
      name: `Thu chi ${format(month, "MM-yyyy")}`,
      columns: columns.map((header, i) => ({ header, width: i === 6 ? 30 : i === 2 ? 24 : 16 })),
      rows: [...rows, [], ["Tổng thu", "", "", income], ["Tổng chi", "", "", expense], ["Số dư", "", "", income - expense]],
    },
  ]);
}
