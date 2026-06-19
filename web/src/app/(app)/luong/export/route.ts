import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất bảng lương tháng: ?format=xlsx (mặc định) | doc | csv. */
export async function GET(req: Request) {
  await requireUser(["ADMIN", "MANAGER"]);
  const url = new URL(req.url);
  const m = url.searchParams.get("m");
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const standardDays = Math.max(1, Math.min(31, Number(url.searchParams.get("d")) || STANDARD_DAYS_DEFAULT));
  const parsed = m ? new Date(`${m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthLabel = format(monthDate, "MM/yyyy");
  const fileBase = `bang-luong-${format(monthDate, "yyyy-MM")}`;
  const p = await getPayroll(monthDate, standardDays);

  const staffCols = ["Nhân viên", "Vai trò", "Ngày công", "Ngày chuẩn", "Lương cứng", "Hoa hồng", "Diễn giải hoa hồng", "Thưởng", "Điều chỉnh", "Tổng nhận"];
  const staffRows: Cell[][] = p.rows.map((r) => [
    r.name,
    ROLE_LABELS[r.role],
    r.daysWorked,
    standardDays,
    r.baseActual,
    r.commission,
    r.commissionNote === "—" ? "" : r.commissionNote,
    r.bonus,
    r.adjustment,
    r.total,
  ]);
  const ctvCols = ["Cộng tác viên", "Hoa hồng"];
  const ctvRows: Cell[][] = p.ctv.map((c) => [c.name, c.amount]);

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Bảng lương tháng ${monthLabel}`,
      subtitle: `Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc · Ngày công chuẩn: ${standardDays}`,
      sections: [
        { heading: "Lương nhân viên", columns: staffCols, rows: staffRows },
        ...(ctvRows.length ? [{ heading: "Hoa hồng cộng tác viên", columns: ctvCols, rows: ctvRows }] : []),
      ],
    });
  }

  if (fmt === "csv") {
    return csvResponse(fileBase, [staffCols, ...staffRows, [], ctvCols, ...ctvRows]);
  }

  return xlsxResponse(fileBase, [
    { name: `Lương ${format(monthDate, "MM-yyyy")}`, columns: staffCols.map((header) => ({ header })), rows: staffRows },
    ...(ctvRows.length ? [{ name: "Hoa hồng CTV", columns: ctvCols.map((header) => ({ header })), rows: ctvRows }] : []),
  ]);
}
