import { describe, it, expect } from "vitest";
import { buildPayrollLetterheadSheet, type LetterheadRow } from "../payroll-letterhead";
import type { CommissionBreakdown } from "../commission";

const monthDate = new Date("2026-02-01T00:00:00"); // 2026 không nhuận → tháng 2 có 28 ngày

function breakdown(overrides: Partial<CommissionBreakdown> = {}): CommissionBreakdown {
  return {
    attendanceWage: 9_600_000,
    lunchAllowance: 0,
    doctorService: 800_000,
    doctorConsult: 200_000,
    nurseService: 0,
    nurseConsult: 0,
    consultant: { newRevenue: 0, newRate: 0, newCommission: 0, returningRevenue: 0, returningRate: 0, returningCommission: 0, total: 0 },
    totalCommission: 1_000_000,
    total: 10_600_000,
    ...overrides,
  };
}

function row(overrides: Partial<LetterheadRow> = {}): LetterheadRow {
  return {
    name: "Nguyễn Văn A",
    roleLabel: "Bác sĩ",
    baseFull: 10_000_000,
    baseActual: 9_600_000,
    daysWorked: 25,
    presentDays: new Set([1, 2, 3]),
    bonus: 100_000,
    adjustment: -50_000,
    breakdown: breakdown(),
    ...overrides,
  };
}

// Chỉ số cột (0-based) khớp với COL/COL2 trong payroll-letterhead.ts cho tháng 28 ngày.
const COL = { stt: 0, name: 1, role: 2, baseFull: 3, baseDay: 4, dayStart: 5 };
const DAY_COUNT = 28;
const afterDays = COL.dayStart + DAY_COUNT; // 33
const COL2 = { actualDays: afterDays, lunch: afterDays + 1, consult: afterDays + 2, procedure: afterDays + 3, bonusAdj: afterDays + 4, total: afterDays + 5, signature: afterDays + 6 };
const HEADER_ROWS = 7; // company x2, blank, title, note, header x2
const DATA_ROW = HEADER_ROWS; // dòng nhân sự đầu tiên (0-based)

describe("buildPayrollLetterheadSheet", () => {
  it("dựng đúng metadata sheet (tên, khổ ngang)", () => {
    const sheet = buildPayrollLetterheadSheet(monthDate, 26, [row()]);
    expect(sheet.name).toBe("Bảng lương 02-2026");
    expect(sheet.landscape).toBe(true);
  });

  it("tính đúng Hoa Hồng Tư Vấn / Tiền Thủ Thuật / Tổng cộng hưởng lương cho 1 dòng", () => {
    const sheet = buildPayrollLetterheadSheet(monthDate, 26, [row()]);
    const r = sheet.rows[DATA_ROW];
    // Phụ cấp cơm trưa = 25 ngày × 25.000đ
    expect(r[COL2.lunch]?.value).toBe(625_000);
    // Tư vấn = doctorConsult(200k) + nurseConsult(0) + consultant.total(0)
    expect(r[COL2.consult]?.value).toBe(200_000);
    // Thủ thuật = doctorService(800k) + nurseService(0)
    expect(r[COL2.procedure]?.value).toBe(800_000);
    // Thưởng/ĐC = 100k + (-50k)
    expect(r[COL2.bonusAdj]?.value).toBe(50_000);
    // Tổng = baseActual(9.6tr) + lunch(625k) + consult(200k) + procedure(800k) + bonusAdj(50k)
    expect(r[COL2.total]?.value).toBe(11_275_000);
    expect(r[COL2.actualDays]?.value).toBe(25);
  });

  it("đánh dấu đúng ô ngày công có mặt, để trống ngày vắng", () => {
    const sheet = buildPayrollLetterheadSheet(monthDate, 26, [row()]);
    const r = sheet.rows[DATA_ROW];
    expect(r[COL.dayStart + 0]?.value).toBe(1); // ngày 1: có mặt
    expect(r[COL.dayStart + 1]?.value).toBe(1); // ngày 2: có mặt
    expect(r[COL.dayStart + 3]).toBeFalsy(); // ngày 4: vắng → ô trống
  });

  it("Mức lương 1 ngày chỉ tham khảo, KHÔNG dùng để tính Tổng cộng (dùng baseActual)", () => {
    const sheet = buildPayrollLetterheadSheet(monthDate, 26, [row({ daysWorked: 0, presentDays: new Set() })]);
    const r = sheet.rows[DATA_ROW];
    expect(r[COL.baseDay]?.value).toBe(Math.round(10_000_000 / 26));
    // baseActual vẫn 9.6tr (giả lập) dù daysWorked=0 trong test này — chứng minh Tổng cộng
    // lấy từ baseActual đã truyền vào, không tự nhân lại baseDay × daysWorked.
    expect(r[COL2.total]?.value).toBe(9_600_000 + 0 + 200_000 + 800_000 + 50_000);
  });

  it("dòng Tổng cộng = tổng đúng Tổng cộng hưởng lương của mọi người", () => {
    const rowA = row({ name: "A" });
    const rowB = row({ name: "B", breakdown: breakdown({ doctorService: 0, doctorConsult: 0, totalCommission: 0 }), bonus: 0, adjustment: 0 });
    const sheet = buildPayrollLetterheadSheet(monthDate, 26, [rowA, rowB]);
    const totalRowIndex = HEADER_ROWS + 2; // sau 2 dòng nhân sự
    const totalRow = sheet.rows[totalRowIndex];
    expect(totalRow[COL.stt]?.value).toBe("Tổng cộng");
    // A: 11.275.000 (như test trên) · B: baseActual 9.6tr + lunch 625k + 0 + 0 + 0 = 10.225.000
    expect(totalRow[COL2.total]?.value).toBe(11_275_000 + 10_225_000);
  });
});
