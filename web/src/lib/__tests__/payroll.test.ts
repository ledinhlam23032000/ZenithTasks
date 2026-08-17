import { describe, it, expect } from "vitest";
import { missingAttendanceStaff, computeBaseActual, debtByStaff } from "../payroll-pure";

describe("missingAttendanceStaff", () => {
  it("trả mảng rỗng khi ai cũng có ngày công", () => {
    const rows = [{ id: "1", daysWorked: 20 }, { id: "2", daysWorked: 5 }];
    expect(missingAttendanceStaff(rows)).toEqual([]);
  });

  it("lọc đúng những người 0 ngày công", () => {
    const rows = [{ id: "1", daysWorked: 20 }, { id: "2", daysWorked: 0 }, { id: "3", daysWorked: 0 }];
    expect(missingAttendanceStaff(rows).map((r) => r.id)).toEqual(["2", "3"]);
  });

  it("trả mảng rỗng khi input rỗng", () => {
    expect(missingAttendanceStaff([])).toEqual([]);
  });

  it("không coi ngày công thấp nhưng khác 0 là thiếu", () => {
    const rows = [{ id: "1", daysWorked: 1 }];
    expect(missingAttendanceStaff(rows)).toEqual([]);
  });
});

describe("debtByStaff", () => {
  it("không đếm đôi công nợ khi một người vừa tư vấn vừa là bác sĩ của cùng hồ sơ", () => {
    const result = debtByStaff([{ consultantId: "doctor-1", doctorId: "doctor-1", debt: 17_500_000 }]);
    expect(result.get("doctor-1")).toBe(17_500_000);
  });

  it("vẫn phân bổ cùng công nợ cho hai nhân sự khác nhau theo vai trò phụ trách", () => {
    const result = debtByStaff([{ consultantId: "consultant-1", doctorId: "doctor-1", debt: 17_500_000 }]);
    expect(result.get("consultant-1")).toBe(17_500_000);
    expect(result.get("doctor-1")).toBe(17_500_000);
  });

  it("bỏ qua công nợ âm hoặc không hữu hạn", () => {
    expect(debtByStaff([
      { consultantId: "a", doctorId: "a", debt: -1 },
      { consultantId: "b", doctorId: null, debt: Number.NaN },
    ])).toEqual(new Map());
  });
});

describe("computeBaseActual", () => {
  it("đi làm đúng ngày chuẩn → nhận đủ lương cứng", () => {
    expect(computeBaseActual(10_000_000, 26, 26)).toBe(10_000_000);
  });

  it("đi làm ÍT hơn ngày chuẩn → trừ theo tỉ lệ", () => {
    expect(computeBaseActual(10_000_000, 13, 26)).toBe(5_000_000);
  });

  it("đi làm NHIỀU hơn ngày chuẩn → cộng thêm theo tỉ lệ (không kẹp trần 100%)", () => {
    // 10tr/26 ngày công, đi làm đủ 31 ngày → phải > 10tr, không giữ nguyên 10tr
    expect(computeBaseActual(10_000_000, 31, 26)).toBeCloseTo(11_923_077, -1);
    expect(computeBaseActual(10_000_000, 31, 26)).toBeGreaterThan(10_000_000);
  });

  it("ngày công chuẩn <= 0 → trả về 0 (tránh chia cho 0)", () => {
    expect(computeBaseActual(10_000_000, 20, 0)).toBe(0);
  });
});
