// ============================================================================
// PHỤ LỤC HOA HỒNG — dựng RichSheet liệt kê TỪNG DÒNG đóng góp vào hoa hồng
// của 1 nhân sự trong tháng (ngày · hồ sơ · khách hàng · loại · tỉ lệ · giá
// trị · số tiền), theo đúng bố cục mẫu chủ gửi (Lam.xlsx: ngày, khách hàng,
// người thực hiện, tỉ lệ, giá trị dịch vụ, hoa hồng, tổng cộng). Dữ liệu lấy
// từ CommissionCaseDetail (lib/commission-data.ts) — KHÔNG tự tính lại, chỉ
// trình bày cho đúng mẫu.
// ============================================================================

import { format } from "date-fns";
import type { RichSheet, RichCell, RichCellStyle } from "@/lib/xlsx";
import type { CommissionCaseDetail } from "@/lib/commission-data";
import { NURSE_SERVICE_FEE_PER_CASE } from "@/lib/commission";
import { formatVND } from "@/lib/money";

const FONT = { name: "Times New Roman" };

const sTitle: RichCellStyle = { font: { ...FONT, size: 13, bold: true }, align: "center" };
const sHeader: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "center", valign: "center", wrap: true, border: true, fill: "header" };
const sBody: RichCellStyle = { font: { ...FONT, size: 11 }, border: true };
const sBodyCenter: RichCellStyle = { ...sBody, align: "center" };
const sBodyMoney: RichCellStyle = { ...sBody, align: "right", numFmt: "int" };
const sTotalLabel: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "right", border: true, fill: "header" };
const sTotalMoney: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "right", border: true, fill: "header", numFmt: "int" };

const ROLE_LABEL: Record<CommissionCaseDetail["role"], string> = {
  "doctor-service": "Dịch vụ trực tiếp thực hiện",
  "doctor-consult": "Tư vấn khách cũ",
  "nurse-service": "Phụ trách ca dịch vụ",
  "nurse-consult": "Tư vấn",
  "consultant-new": "Tư vấn khách mới",
  "consultant-returning": "Tư vấn khách cũ",
};

function tc(value: string | number, style: RichCellStyle): RichCell {
  return { value, style };
}

/** Dựng 1 sheet phụ lục hoa hồng cho 1 nhân sự — trả về null nếu không có dòng nào (không tạo sheet rỗng). */
export function buildCommissionAppendixSheet(staffName: string, monthDate: Date, details: CommissionCaseDetail[]): RichSheet | null {
  if (details.length === 0) return null;

  const rows: RichCell[][] = [];
  rows.push([tc(`PHỤ LỤC HOA HỒNG — ${staffName} — Tháng ${format(monthDate, "MM/yyyy")}`, sTitle)]);
  rows.push([]);
  rows.push([
    tc("Ngày", sHeader),
    tc("Mã hồ sơ", sHeader),
    tc("Khách hàng", sHeader),
    tc("Loại hoa hồng", sHeader),
    tc("Tỷ lệ", sHeader),
    tc("Giá trị tính hoa hồng", sHeader),
    tc("Hoa hồng", sHeader),
  ]);

  for (const d of details) {
    const isFixedFee = d.role === "nurse-service";
    rows.push([
      tc(format(d.date, "dd/MM/yyyy"), sBodyCenter),
      tc(d.caseCode, sBodyCenter),
      tc(d.customerName, sBody),
      tc(ROLE_LABEL[d.role], sBody),
      tc(isFixedFee ? `${formatVND(NURSE_SERVICE_FEE_PER_CASE)}/ca` : `${Math.round(d.rate * 1000) / 10}%`, sBodyCenter),
      tc(isFixedFee ? "—" : d.base, isFixedFee ? sBodyCenter : sBodyMoney),
      tc(d.amount, sBodyMoney),
    ]);
  }

  const total = details.reduce((s, d) => s + d.amount, 0);
  const totalExcelRow = rows.length + 1;
  rows.push([tc("Tổng cộng", sTotalLabel), null, null, null, null, null, tc(total, sTotalMoney)]);

  return {
    name: staffName.slice(0, 31),
    rows,
    columnWidths: [11, 12, 22, 22, 14, 16, 14],
    merges: [`A1:G1`, `A${totalExcelRow}:F${totalExcelRow}`],
  };
}
