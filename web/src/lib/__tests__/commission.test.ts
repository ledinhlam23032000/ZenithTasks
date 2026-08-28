import { describe, it, expect } from "vitest";
import {
  lunchAllowance,
  doctorServiceCommission,
  allocateDoctorServiceBase,
  doctorConsultCommission,
  nurseServiceFee,
  nurseConsultCommission,
  bracketRate,
  consultantCommission,
  computeCommissionBreakdown,
  CONSULTANT_NEW_BRACKETS,
  CONSULTANT_RETURNING_BRACKETS,
} from "../commission";

describe("lunchAllowance", () => {
  it("25.000đ mỗi ngày công", () => {
    expect(lunchAllowance(29)).toBe(725_000);
    expect(lunchAllowance(0)).toBe(0);
  });
});

describe("hoa hồng bác sĩ", () => {
  it("8% giá trị dịch vụ trực tiếp thực hiện", () => {
    expect(doctorServiceCommission(27_000_000)).toBe(2_160_000);
  });

  it("10% giá trị ca tư vấn cho khách CŨ (khách mới không truyền vào, coi như 0%)", () => {
    expect(doctorConsultCommission(5_000_000)).toBe(500_000);
    expect(doctorConsultCommission(0)).toBe(0);
  });
});

describe("hoa hồng điều dưỡng", () => {
  it("100k / ca dịch vụ phụ trách", () => {
    expect(nurseServiceFee(12)).toBe(1_200_000);
  });

  it("4% giá trị ca được giao làm tư vấn viên", () => {
    expect(nurseConsultCommission(10_000_000)).toBe(400_000);
  });
});

describe("bracketRate", () => {
  it("khách mới: đúng ranh giới 500tr và 800tr", () => {
    expect(bracketRate(0, CONSULTANT_NEW_BRACKETS)).toBe(0.03);
    expect(bracketRate(499_999_999, CONSULTANT_NEW_BRACKETS)).toBe(0.03);
    expect(bracketRate(500_000_000, CONSULTANT_NEW_BRACKETS)).toBe(0.04);
    expect(bracketRate(799_999_999, CONSULTANT_NEW_BRACKETS)).toBe(0.04);
    expect(bracketRate(800_000_000, CONSULTANT_NEW_BRACKETS)).toBe(0.05);
  });

  it("khách cũ: đúng ranh giới 200tr và 500tr", () => {
    expect(bracketRate(0, CONSULTANT_RETURNING_BRACKETS)).toBe(0.04);
    expect(bracketRate(199_999_999, CONSULTANT_RETURNING_BRACKETS)).toBe(0.04);
    expect(bracketRate(200_000_000, CONSULTANT_RETURNING_BRACKETS)).toBe(0.05);
    expect(bracketRate(500_000_000, CONSULTANT_RETURNING_BRACKETS)).toBe(0.06);
  });
});

describe("consultantCommission", () => {
  it("tính TRỌN GÓI theo bậc đạt được — không luỹ tiến từng phần", () => {
    // 600tr khách mới rơi vào bậc 500-800tr (4%) → toàn bộ 600tr tính 4%,
    // KHÔNG phải 500tr đầu 3% + 100tr sau 4%.
    const r = consultantCommission(600_000_000, 150_000_000);
    expect(r.newRate).toBe(0.04);
    expect(r.newCommission).toBe(24_000_000);
    expect(r.returningRate).toBe(0.04);
    expect(r.returningCommission).toBe(6_000_000);
    expect(r.total).toBe(30_000_000);
  });

  it("doanh số 0 → hoa hồng 0, không lỗi", () => {
    const r = consultantCommission(0, 0);
    expect(r.total).toBe(0);
  });
});

describe("computeCommissionBreakdown", () => {
  it("cộng đúng tổng cho hồ sơ bác sĩ đầy đủ", () => {
    const b = computeCommissionBreakdown({
      attendanceWage: 11_923_077,
      daysWorked: 31,
      doctorServiceRevenue: 27_000_000,
      doctorReturningConsultRevenue: 5_000_000,
    });
    expect(b.attendanceWage).toBe(11_923_077);
    expect(b.lunchAllowance).toBe(775_000);
    expect(b.doctorService).toBe(2_160_000);
    expect(b.doctorConsult).toBe(500_000);
    expect(b.totalCommission).toBe(2_160_000 + 500_000);
    expect(b.total).toBe(b.attendanceWage + b.lunchAllowance + b.totalCommission);
  });

  it("vai trò không có hoa hồng nào (vd Lễ Tân) → chỉ có lương theo công + phụ cấp", () => {
    const b = computeCommissionBreakdown({ attendanceWage: 7_807_692, daysWorked: 29 });
    expect(b.totalCommission).toBe(0);
    expect(b.total).toBe(b.attendanceWage + b.lunchAllowance);
  });
});

describe("allocateDoctorServiceBase", () => {
  it("chỉ phân bổ phần dịch vụ CÓ bác sĩ, không hút phần không gắn ai", () => {
    // Hồ sơ 10tr = 6tr (bác sĩ A) + 4tr (không gắn ai), khách trả đủ 10tr.
    const out = allocateDoctorServiceBase(10_000_000, [{ doctorId: "A", revenue: 6_000_000 }], 10_000_000);
    expect(out).toEqual([{ doctorId: "A", base: 6_000_000 }]);
    expect(doctorServiceCommission(out[0].base)).toBe(480_000);
  });

  it("chia theo tỷ trọng khi nhiều bác sĩ và vẫn chừa phần không gắn ai", () => {
    // 10tr = A 3tr + B 3tr + 4tr không gắn ai -> tổng căn cứ phải là 6tr, không phải 10tr.
    const out = allocateDoctorServiceBase(10_000_000, [
      { doctorId: "A", revenue: 3_000_000 },
      { doctorId: "B", revenue: 3_000_000 },
    ], 10_000_000);
    expect(out.reduce((s, r) => s + r.base, 0)).toBe(6_000_000);
    expect(out).toEqual([{ doctorId: "A", base: 3_000_000 }, { doctorId: "B", base: 3_000_000 }]);
  });

  it("mọi dịch vụ đều có bác sĩ thì phân bổ trọn khoản thu", () => {
    const out = allocateDoctorServiceBase(9_000_000, [
      { doctorId: "A", revenue: 6_000_000 },
      { doctorId: "B", revenue: 3_000_000 },
    ], 9_000_000);
    expect(out.reduce((s, r) => s + r.base, 0)).toBe(9_000_000);
  });

  it("khách trả một phần thì căn cứ giảm theo tỷ lệ", () => {
    // Trả 5tr trên hồ sơ 10tr, bác sĩ giữ 6tr -> căn cứ = 5tr * 6/10 = 3tr.
    const out = allocateDoctorServiceBase(5_000_000, [{ doctorId: "A", revenue: 6_000_000 }], 10_000_000);
    expect(out).toEqual([{ doctorId: "A", base: 3_000_000 }]);
  });

  it("đầu vào rỗng hoặc không hợp lệ trả mảng rỗng, không ném lỗi", () => {
    expect(allocateDoctorServiceBase(0, [{ doctorId: "A", revenue: 1 }], 1)).toEqual([]);
    expect(allocateDoctorServiceBase(1000, [], 1000)).toEqual([]);
    expect(allocateDoctorServiceBase(1000, [{ doctorId: "A", revenue: 1000 }], 0)).toEqual([]);
  });
});
