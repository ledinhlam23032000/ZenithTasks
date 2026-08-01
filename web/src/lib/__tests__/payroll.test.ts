import { describe, it, expect } from "vitest";
import { computeBaseActual } from "../payroll-calc";

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
