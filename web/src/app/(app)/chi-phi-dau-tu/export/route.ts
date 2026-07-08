import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/status";
import { INVESTMENT_CATEGORY_CODE } from "@/lib/finance";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất TOÀN BỘ chi phí đầu tư (chỉ ADMIN/SHAREHOLDER — quyền đã chặn ở requireCap): ?format=xlsx (mặc định) | doc | csv. */
export async function GET(request: Request) {
  await requireCap("mod:chi-phi-dau-tu");
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";

  const txs = await prisma.cashTransaction.findMany({
    where: { category: INVESTMENT_CATEGORY_CODE },
    orderBy: { occurredAt: "asc" },
    include: { createdBy: { select: { fullName: true } } },
  });

  const fileBase = `chi-phi-dau-tu-${format(new Date(), "yyyy-MM-dd")}`;
  const columns = ["Ngày", "Khoản đầu tư / NCC", "Hình thức", "Số tiền (VND)", "Ghi chú", "Người nhập"];
  const rows: Cell[][] = txs.map((t) => [
    format(t.occurredAt, "dd/MM/yyyy"),
    t.vendor ?? "",
    PAYMENT_LABEL[t.method],
    toNum(t.amount),
    t.note ?? "",
    t.createdBy?.fullName ?? "",
  ]);
  const total = txs.reduce((s, t) => s + toNum(t.amount), 0);
  const totalRow: Cell[][] = [["Tổng chi phí đầu tư", "", "", total]];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: "Chi phí đầu tư",
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ heading: `${txs.length} khoản`, columns, rows: [...rows, [], ...totalRow] }],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [columns, ...rows, [], ...totalRow]);
  }
  return xlsxResponse(fileBase, [
    { name: "Chi phí đầu tư", columns: columns.map((header, i) => ({ header, width: i === 1 || i === 4 ? 28 : 16 })), rows: [...rows, [], ...totalRow] },
  ]);
}
