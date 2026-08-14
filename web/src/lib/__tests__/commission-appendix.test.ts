import { describe, it, expect } from "vitest";
import { buildCommissionAppendixSheet } from "../commission-appendix";
import type { CommissionCaseDetail } from "../commission-data";

const monthDate = new Date("2026-08-01T00:00:00");

function detail(overrides: Partial<CommissionCaseDetail>): CommissionCaseDetail {
  return {
    caseId: "c1",
    caseCode: "HS00001",
    customerName: "Nguyễn Thị A",
    date: new Date("2026-08-05T00:00:00"),
    role: "doctor-service",
    rate: 0.08,
    base: 10_000_000,
    amount: 800_000,
    ...overrides,
  };
}

describe("buildCommissionAppendixSheet", () => {
  it("trả về null khi không có dòng nào (không tạo sheet rỗng)", () => {
    expect(buildCommissionAppendixSheet("Bác sĩ Lam", monthDate, [])).toBeNull();
  });

  it("dựng đúng tiêu đề, tiêu đề cột và dòng dữ liệu cho hoa hồng theo %", () => {
    const sheet = buildCommissionAppendixSheet("Bác sĩ Lam", monthDate, [detail({})]);
    expect(sheet).not.toBeNull();
    expect(sheet!.rows[0][0]?.value).toContain("Bác sĩ Lam");
    expect(sheet!.rows[0][0]?.value).toContain("08/2026");
    expect(sheet!.rows[2].map((c) => c?.value)).toEqual([
      "Ngày", "Mã hồ sơ", "Khách hàng", "Loại hoa hồng", "Tỷ lệ", "Giá trị tính hoa hồng", "Hoa hồng",
    ]);
    const dataRow = sheet!.rows[3];
    expect(dataRow[0]?.value).toBe("05/08/2026");
    expect(dataRow[4]?.value).toBe("8%");
    expect(dataRow[5]?.value).toBe(10_000_000);
    expect(dataRow[6]?.value).toBe(800_000);
  });

  it("hiển thị phí cố định 100k/ca cho điều dưỡng phụ trách dịch vụ (không phải %)", () => {
    const sheet = buildCommissionAppendixSheet("ĐD Hoa", monthDate, [
      detail({ role: "nurse-service", rate: 0, base: 1, amount: 100_000 }),
    ]);
    const dataRow = sheet!.rows[3];
    expect(dataRow[4]?.value).toContain("/ca");
    expect(dataRow[5]?.value).toBe("—"); // không có giá trị doanh số thật để hiện
    expect(dataRow[6]?.value).toBe(100_000);
  });

  it("dòng tổng cộng = tổng đúng cột Hoa hồng, có merge nhãn", () => {
    const sheet = buildCommissionAppendixSheet("Bác sĩ Lam", monthDate, [
      detail({ amount: 800_000 }),
      detail({ amount: 1_200_000, role: "doctor-consult", rate: 0.1 }),
    ]);
    const totalRow = sheet!.rows[sheet!.rows.length - 1];
    expect(totalRow[0]?.value).toBe("Tổng cộng");
    expect(totalRow[6]?.value).toBe(2_000_000);
    expect(sheet!.merges).toContain("A1:G1");
  });

  it("cắt tên sheet còn tối đa 31 ký tự (giới hạn Excel)", () => {
    const longName = "Nguyễn Thị Rất Là Dài Dòng Tên Nhân Sự Ví Dụ Kiểm Thử";
    const sheet = buildCommissionAppendixSheet(longName, monthDate, [detail({})]);
    expect(sheet!.name.length).toBeLessThanOrEqual(31);
  });
});
