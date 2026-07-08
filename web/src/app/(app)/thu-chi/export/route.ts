import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/status";
import { CASH_TYPE, categoryLabel, INVESTMENT_CATEGORY_CODE } from "@/lib/finance";
import { isShareholder } from "@/lib/rbac";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";
import type { Prisma, CashType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * Xuất sổ thu chi: ?format=xlsx (mặc định) | doc | csv, ?scope=month (mặc định) | year | all.
 * scope=month/year lấy mốc tháng/năm từ ?month=yyyy-MM (mặc định tháng hiện tại).
 * scope=all xuất TOÀN BỘ lịch sử — phục vụ kiểm toán, không phải chờ xuất từng tháng.
 */
export async function GET(request: Request) {
  const user = await requireCap("mod:thu-chi");
  // Cùng ranh giới với trang: Chi phí đầu tư CHỈ Admin/Cổ đông xuất được (xem lib/finance.ts).
  const canSeeInvestment = user.role === "ADMIN" || isShareholder(user.role);
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const typeParam = url.searchParams.get("type");
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const scope = url.searchParams.get("scope") === "year" || url.searchParams.get("scope") === "all" ? url.searchParams.get("scope")! : "month";

  const monthRef = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date();
  const month = Number.isNaN(monthRef.getTime()) ? new Date() : monthRef;
  const type = typeParam === "INCOME" || typeParam === "EXPENSE" ? (typeParam as CashType) : null;

  let dateRange: { gte: Date; lte: Date } | null = null;
  let scopeLabel: string;
  let fileBase: string;
  if (scope === "all") {
    scopeLabel = "Toàn bộ";
    fileBase = "thu-chi-toan-bo";
  } else if (scope === "year") {
    dateRange = { gte: startOfYear(month), lte: endOfYear(month) };
    scopeLabel = `Cả năm ${format(month, "yyyy")}`;
    fileBase = `thu-chi-${format(month, "yyyy")}`;
  } else {
    dateRange = { gte: startOfMonth(month), lte: endOfMonth(month) };
    scopeLabel = `Tháng ${format(month, "MM/yyyy")}`;
    fileBase = `thu-chi-${format(month, "yyyy-MM")}`;
  }

  const where: Prisma.CashTransactionWhereInput = {
    ...(dateRange ? { occurredAt: dateRange } : {}),
    ...(type ? { type } : {}),
    ...(canSeeInvestment ? {} : { category: { not: INVESTMENT_CATEGORY_CODE } }),
  };
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
      title: `Sổ thu chi — ${scopeLabel}`,
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
      name: scopeLabel.slice(0, 31),
      columns: columns.map((header, i) => ({ header, width: i === 6 ? 30 : i === 2 ? 24 : 16 })),
      rows: [...rows, [], ["Tổng thu", "", "", income], ["Tổng chi", "", "", expense], ["Số dư", "", "", income - expense]],
    },
  ]);
}
