import { describe, it, expect } from "vitest";
import { nextSeq, isUniqueViolation } from "../seq";

describe("nextSeq (sinh mã không trùng)", () => {
  it("danh sách rỗng → 1", () => {
    expect(nextSeq([], "HS")).toBe(1);
  });

  it("lấy max + 1 (không phải count + 1) — an toàn sau khi xóa", () => {
    // Đã xóa HS00002: count = 2 nhưng max = 3 → phải ra 4 (không trùng HS00003).
    expect(nextSeq(["HS00001", "HS00003"], "HS")).toBe(4);
  });

  it("bỏ qua mã khác tiền tố / null", () => {
    expect(nextSeq(["KH00009", null, "HS00005", undefined], "HS")).toBe(6);
  });

  it("hoạt động với tiền tố khách hàng", () => {
    expect(nextSeq(["KH00010", "KH00002"], "KH")).toBe(11);
  });
});

describe("isUniqueViolation", () => {
  it("nhận diện lỗi P2002", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
  });
});
