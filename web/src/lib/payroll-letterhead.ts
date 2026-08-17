// ============================================================================
// BẢNG LƯƠNG ĐÚNG MẪU KẾ TOÁN — dựng RichSheet cho buildRichXlsx (lib/xlsx.ts),
// theo đúng bố cục file mẫu chủ cung cấp ("Bảng Lương Tháng 7 Nội Bộ.xlsx"):
// tiêu đề công ty + quốc hiệu, lưới ngày công 1..N, Công thực tế / Phụ cấp
// cơm trưa / Hoa hồng tư vấn / Tiền thủ thuật / Tổng cộng hưởng lương, chữ ký
// 3 bên (Người lập biểu / Kế toán / Thủ trưởng đơn vị).
//
// GHI CHÚ QUAN TRỌNG (đọc trước khi sửa số):
// - "Hoa Hồng Tư Vấn" = mọi khoản hoa hồng THEO TƯ VẤN (bác sĩ 10% khách cũ,
//   điều dưỡng 4%, tư vấn viên bậc trọn gói khách mới/cũ) — xem lib/commission.ts.
//   "Tiền Thủ Thuật" = hoa hồng THEO THỰC HIỆN DỊCH VỤ (bác sĩ 8%, điều dưỡng
//   100k/ca). Cách gộp này khớp với đúng 2 cột hoa hồng trong mẫu chủ gửi.
// - "Công thực tế" trong Tổng cộng lấy ĐÚNG `PayrollRow.baseActual`
//   (payroll-pure.ts computeBaseActual) — KHÔNG tính lại từ "Mức lương 1
//   ngày" × ngày công, để tránh 2 công thức lương-theo-công lệch nhau (bài
//   học từ lúc xây lib/commission.ts). Cột "Mức lương 1 ngày" trên bảng chỉ
//   mang tính tham khảo cho kế toán, không phải số dùng để tính Tổng cộng.
// - "Tổng cộng hưởng lương" = Công thực tế + Phụ cấp cơm trưa + Hoa hồng tư
//   vấn + Tiền thủ thuật + Thưởng/Điều chỉnh — CÓ gồm phụ cấp cơm trưa, nên
//   sẽ KHÁC cột "Tổng nhận" ở trang /luong (trang đó chưa có khái niệm phụ
//   cấp cơm trưa, xem BAN-GIAO.md mục "Lương & hoa hồng"). Đây là đúng công
//   thức thật trong văn bản "Cách tính lương nhân sự Trung Tâm" chủ cung
//   cấp (đã đối chiếu số liệu mẫu chủ gửi khớp chính xác), KHÔNG phải sai
//   lệch — nếu muốn 2 số này khớp nhau, cần thêm phụ cấp cơm trưa vào
//   PayrollEntry (chưa làm, vì chưa có yêu cầu đổi schema).
// - Ngày chấm công lấy TỪ Attendance (chỉ có/không, KHÔNG có nửa ngày — khác
//   mẫu gốc có ghi "0,5") — giới hạn của schema hiện tại, không phải lỗi.
// ============================================================================

import { format, getDaysInMonth } from "date-fns";
import { colName, type RichSheet, type RichCell, type RichCellStyle } from "@/lib/xlsx";
import { lunchAllowance, type CommissionBreakdown } from "@/lib/commission";

const COMPANY_NAME = "CÔNG TY CỔ PHẦN BỆNH VIỆN HỒNG PHÚC";
const COMPANY_ADDRESS = "Số 5 Hồ Xuân Hương, phường Hồng Bàng, thành phố Hải Phòng";

export type LetterheadRow = {
  name: string;
  roleLabel: string;
  baseFull: number;
  baseActual: number;
  daysWorked: number;
  presentDays: Set<number>;
  bonus: number;
  adjustment: number;
  breakdown: CommissionBreakdown;
};

const FONT = { name: "Times New Roman" };

const sCompanyTitle: RichCellStyle = { font: { ...FONT, size: 14, bold: true }, align: "center" };
const sAddress: RichCellStyle = { font: { ...FONT, size: 12, bold: true }, align: "center" };
const sDocTitle: RichCellStyle = { font: { ...FONT, size: 15, bold: true }, align: "center" };
const sNote: RichCellStyle = { font: { ...FONT, size: 10 }, align: "center" };
const sHeader: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "center", valign: "center", wrap: true, border: true, fill: "header" };
const sHeaderPlain: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "center", valign: "center", wrap: true, border: true };
const sBody: RichCellStyle = { font: { ...FONT, size: 11 }, border: true };
const sBodyCenter: RichCellStyle = { ...sBody, align: "center" };
const sBodyMoney: RichCellStyle = { ...sBody, align: "right", numFmt: "int" };
const sBodyMoneyBold: RichCellStyle = { ...sBodyMoney, font: { ...FONT, size: 11, bold: true } };
const sTotalLabel: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "center", border: true, fill: "header" };
const sTotalMoney: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "right", border: true, fill: "header", numFmt: "int" };
const sSignature: RichCellStyle = { font: { ...FONT, size: 11, bold: true }, align: "center" };
const sSignatureSpace: RichCellStyle = { font: { ...FONT, size: 11 }, align: "center" };

function tc(value: string | number, style: RichCellStyle): RichCell {
  return { value, style };
}

/** Hoa hồng "theo tư vấn" — bác sĩ (khách cũ) + điều dưỡng + tư vấn viên (mới+cũ). */
function consultCommission(b: CommissionBreakdown): number {
  return b.doctorConsult + b.nurseConsult + b.consultant.total;
}

/** Hoa hồng "theo thủ thuật/dịch vụ" — bác sĩ + điều dưỡng phụ trách ca. */
function procedureCommission(b: CommissionBreakdown): number {
  return b.doctorService + b.nurseService;
}

export function buildPayrollLetterheadSheet(monthDate: Date, standardDays: number, rows: LetterheadRow[]): RichSheet {
  const dayCount = getDaysInMonth(monthDate);
  const COL = { stt: 0, name: 1, role: 2, baseFull: 3, baseDay: 4, dayStart: 5 };
  const afterDays = COL.dayStart + dayCount;
  const COL2 = {
    actualDays: afterDays,
    lunch: afterDays + 1,
    consult: afterDays + 2,
    procedure: afterDays + 3,
    bonusAdj: afterDays + 4,
    total: afterDays + 5,
    signature: afterDays + 6,
  };
  const totalCols = COL2.signature + 1;
  const lastCol = totalCols - 1;

  const columnWidths: (number | undefined)[] = new Array(totalCols).fill(undefined);
  columnWidths[COL.stt] = 5;
  columnWidths[COL.name] = 22;
  columnWidths[COL.role] = 13;
  columnWidths[COL.baseFull] = 13;
  columnWidths[COL.baseDay] = 12;
  for (let d = 0; d < dayCount; d++) columnWidths[COL.dayStart + d] = 3;
  columnWidths[COL2.actualDays] = 10;
  columnWidths[COL2.lunch] = 12;
  columnWidths[COL2.consult] = 13;
  columnWidths[COL2.procedure] = 13;
  columnWidths[COL2.bonusAdj] = 13;
  columnWidths[COL2.total] = 15;
  columnWidths[COL2.signature] = 12;

  const emptyRow = (): RichCell[] => new Array(totalCols).fill(null);
  const sheetRows: RichCell[][] = [];

  const r1 = emptyRow();
  r1[COL.stt] = tc(COMPANY_NAME, sCompanyTitle);
  r1[COL.dayStart] = tc("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", sCompanyTitle);
  sheetRows.push(r1);

  const r2 = emptyRow();
  r2[COL.stt] = tc(COMPANY_ADDRESS, sAddress);
  r2[COL.dayStart] = tc("Độc Lập - Tự Do - Hạnh Phúc", sAddress);
  sheetRows.push(r2);

  sheetRows.push(emptyRow());

  const r4 = emptyRow();
  r4[COL.stt] = tc(`BẢNG THANH TOÁN LƯƠNG THÁNG ${format(monthDate, "M")} NĂM ${format(monthDate, "yyyy")}`, sDocTitle);
  sheetRows.push(r4);

  const r5 = emptyRow();
  r5[COL.stt] = tc(
    `Ngày công chuẩn: ${standardDays} ngày/tháng — Hoa hồng tính tự động theo cơ chế lương hiện hành, có thể điều chỉnh ở cột Thưởng/Điều chỉnh.`,
    sNote,
  );
  sheetRows.push(r5);

  const r6 = emptyRow();
  r6[COL.stt] = tc("STT", sHeader);
  r6[COL.name] = tc("Họ và Tên", sHeader);
  r6[COL.role] = tc("Chức vụ", sHeader);
  r6[COL.baseFull] = tc("Mức lương cơ bản", sHeader);
  r6[COL.baseDay] = tc("Mức lương 1 ngày", sHeader);
  r6[COL.dayStart] = tc(`Ngày công trong tháng ${format(monthDate, "M")}`, sHeader);
  r6[COL2.actualDays] = tc("Công thực tế", sHeader);
  r6[COL2.lunch] = tc("Phụ Cấp Cơm Trưa", sHeader);
  r6[COL2.consult] = tc("Hoa Hồng Tư Vấn", sHeader);
  r6[COL2.procedure] = tc("Tiền Thủ Thuật", sHeader);
  r6[COL2.bonusAdj] = tc("Thưởng / Điều chỉnh", sHeader);
  r6[COL2.total] = tc("Tổng cộng hưởng lương", sHeader);
  r6[COL2.signature] = tc("Chữ ký", sHeader);
  sheetRows.push(r6);

  const r7 = emptyRow();
  for (let d = 1; d <= dayCount; d++) r7[COL.dayStart + d - 1] = tc(d, sHeaderPlain);
  sheetRows.push(r7);

  rows.forEach((s, i) => {
    const r = emptyRow();
    r[COL.stt] = tc(i + 1, sBodyCenter);
    r[COL.name] = tc(s.name, sBody);
    r[COL.role] = tc(s.roleLabel, sBodyCenter);
    r[COL.baseFull] = tc(s.baseFull, sBodyMoney);
    r[COL.baseDay] = tc(Math.round(s.baseFull / standardDays), sBodyMoney);
    for (let d = 1; d <= dayCount; d++) {
      if (s.presentDays.has(d)) r[COL.dayStart + d - 1] = tc(1, sBodyCenter);
    }
    const lunch = lunchAllowance(s.daysWorked);
    const consult = consultCommission(s.breakdown);
    const procedure = procedureCommission(s.breakdown);
    const bonusAdj = s.bonus + s.adjustment;
    const total = s.baseActual + lunch + consult + procedure + bonusAdj;
    r[COL2.actualDays] = tc(s.daysWorked, sBodyCenter);
    r[COL2.lunch] = tc(lunch, sBodyMoney);
    r[COL2.consult] = tc(consult, sBodyMoney);
    r[COL2.procedure] = tc(procedure, sBodyMoney);
    r[COL2.bonusAdj] = tc(bonusAdj, sBodyMoney);
    r[COL2.total] = tc(total, sBodyMoneyBold);
    r[COL2.signature] = tc("", sBody);
    sheetRows.push(r);
  });

  const totalRow = emptyRow();
  totalRow[COL.stt] = tc("Tổng cộng", sTotalLabel);
  const grandTotal = rows.reduce((sum, s) => {
    const total = s.baseActual + lunchAllowance(s.daysWorked) + consultCommission(s.breakdown) + procedureCommission(s.breakdown) + s.bonus + s.adjustment;
    return sum + total;
  }, 0);
  totalRow[COL2.total] = tc(grandTotal, sTotalMoney);
  const totalRowExcelIndex = sheetRows.length + 1;
  sheetRows.push(totalRow);

  sheetRows.push(emptyRow());
  sheetRows.push(emptyRow());

  const dateRow = emptyRow();
  dateRow[COL2.bonusAdj] = tc(`Hải Phòng, ngày ..... tháng ${format(monthDate, "M")} năm ${format(monthDate, "yyyy")}`, sSignatureSpace);
  sheetRows.push(dateRow);

  const sigRow = emptyRow();
  sigRow[COL.name] = tc("Người lập biểu", sSignature);
  sigRow[Math.floor(totalCols / 2)] = tc("Kế toán", sSignature);
  sigRow[COL2.bonusAdj] = tc("Thủ trưởng đơn vị", sSignature);
  sheetRows.push(sigRow);

  const merges: string[] = [
    `${colName(COL.stt)}1:${colName(COL.dayStart - 1)}1`,
    `${colName(COL.dayStart)}1:${colName(lastCol)}1`,
    `${colName(COL.stt)}2:${colName(COL.dayStart - 1)}2`,
    `${colName(COL.dayStart)}2:${colName(lastCol)}2`,
    `${colName(COL.stt)}4:${colName(lastCol)}4`,
    `${colName(COL.stt)}5:${colName(lastCol)}5`,
    `${colName(COL.dayStart)}6:${colName(afterDays - 1)}6`,
    `${colName(COL.stt)}${totalRowExcelIndex}:${colName(COL.baseDay)}${totalRowExcelIndex}`,
  ];
  const vertMergeHeaderCols = [
    COL.stt, COL.name, COL.role, COL.baseFull, COL.baseDay,
    COL2.actualDays, COL2.lunch, COL2.consult, COL2.procedure, COL2.bonusAdj, COL2.total, COL2.signature,
  ];
  for (const c of vertMergeHeaderCols) merges.push(`${colName(c)}6:${colName(c)}7`);

  return {
    name: `Bảng lương ${format(monthDate, "MM-yyyy")}`,
    rows: sheetRows,
    columnWidths,
    rowHeights: [undefined, undefined, undefined, undefined, undefined, 40, 18],
    merges,
    landscape: true,
  };
}
