import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { stockValue } from "@/lib/inventory-cost";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

const MOVE_LABEL: Record<string, string> = { IN: "Nhập", OUT: "Xuất", ADJUST: "Điều chỉnh" };

/** Xuất kho vật tư (tồn kho hiện tại + TOÀN BỘ lịch sử nhập/xuất): ?format=xlsx (mặc định) | doc | csv. */
export async function GET(request: Request) {
  await requireCap("mod:kho");
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";

  const [materials, movements] = await Promise.all([
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      include: { material: { select: { name: true, unit: true } }, createdBy: { select: { fullName: true } } },
    }),
  ]);

  const fileBase = `kho-${format(new Date(), "yyyy-MM-dd")}`;

  const stockColumns = ["Vật tư", "Tồn", "Tối thiểu", "Đơn vị", "Giá vốn/đơn vị (VND)", "Giá trị tồn (VND)", "Hạn dùng", "Lô"];
  const stockRows: Cell[][] = materials.map((m) => {
    const stock = toNum(m.stock);
    const avg = toNum(m.avgCost);
    return [m.name, stock, toNum(m.minStock), m.unit, avg, stockValue(stock, avg), m.expiryDate ? format(m.expiryDate, "dd/MM/yyyy") : "", m.lotNo ?? ""];
  });
  const stockTotal: Cell[][] = [["Tổng giá trị tồn kho", "", "", "", "", stockRows.reduce((s, r) => s + (typeof r[5] === "number" ? r[5] : 0), 0)]];

  const moveColumns = ["Loại", "Vật tư", "Số lượng", "Đơn vị", "Đơn giá (VND)", "Ghi chú", "Người nhập", "Thời gian"];
  const moveRows: Cell[][] = movements.map((mv) => [
    MOVE_LABEL[mv.type] ?? mv.type,
    mv.material.name,
    toNum(mv.quantity),
    mv.material.unit,
    mv.unitCost != null ? toNum(mv.unitCost) : "",
    mv.note ?? "",
    mv.createdBy?.fullName ?? "",
    format(mv.createdAt, "dd/MM/yyyy HH:mm"),
  ]);

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: "Kho vật tư",
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [
        { heading: "Tồn kho hiện tại", columns: stockColumns, rows: [...stockRows, [], ...stockTotal] },
        { heading: `Lịch sử nhập/xuất (${movements.length} giao dịch)`, columns: moveColumns, rows: moveRows },
      ],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [
      ["TỒN KHO HIỆN TẠI"],
      stockColumns,
      ...stockRows,
      [],
      ...stockTotal,
      [],
      ["LỊCH SỬ NHẬP/XUẤT"],
      moveColumns,
      ...moveRows,
    ]);
  }
  return xlsxResponse(fileBase, [
    { name: "Tồn kho", columns: stockColumns.map((header, i) => ({ header, width: i === 0 ? 22 : 15 })), rows: [...stockRows, [], ...stockTotal] },
    { name: "Lịch sử nhập xuất", columns: moveColumns.map((header, i) => ({ header, width: i === 5 ? 26 : i === 1 ? 20 : 14 })), rows: moveRows },
  ]);
}
