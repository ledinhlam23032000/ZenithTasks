import { describe, it, expect } from "vitest";
import { toNum, formatVND, formatVNDShort } from "../money";

describe("toNum", () => {
  it("xử lý null/undefined → 0", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });
  it("giữ nguyên số", () => {
    expect(toNum(15000000)).toBe(15000000);
  });
  it("đọc Prisma Decimal (có toNumber)", () => {
    expect(toNum({ toNumber: () => 25000 })).toBe(25000);
  });
  it("ép chuỗi số; chuỗi sai → 0", () => {
    expect(toNum("123")).toBe(123);
    expect(toNum("abc")).toBe(0);
  });
});

describe("formatVND", () => {
  it("kèm ký hiệu ₫ và ngăn cách nghìn", () => {
    const s = formatVND(15000000);
    expect(s).toContain("₫");
    expect(s).toMatch(/15[.\s ]000[.\s ]000/);
  });
});

describe("formatVNDShort", () => {
  it("rút gọn triệu/tỷ", () => {
    expect(formatVNDShort(1_500_000)).toBe("1,5 tr");
    expect(formatVNDShort(2_000_000_000)).toBe("2,0 tỷ");
  });
});
