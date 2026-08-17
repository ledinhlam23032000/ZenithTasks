import { describe, it, expect } from "vitest";
import { debtAgeDays, debtAgingBucket, isOverThreshold } from "../debt-aging";

describe("debtAgeDays", () => {
  it("tính số ngày kể từ createdAt đến now", () => {
    const now = new Date("2026-06-26T00:00:00Z");
    expect(debtAgeDays(new Date("2026-06-20T00:00:00Z"), now)).toBe(6);
  });

  it("không âm dù createdAt ở tương lai (lỗi dữ liệu)", () => {
    const now = new Date("2026-06-26T00:00:00Z");
    expect(debtAgeDays(new Date("2026-07-01T00:00:00Z"), now)).toBe(0);
  });
});

describe("debtAgingBucket", () => {
  it("0-15 ngày", () => {
    expect(debtAgingBucket(0)).toBe("0-15");
    expect(debtAgingBucket(14)).toBe("0-15");
  });
  it("15-30 ngày", () => {
    expect(debtAgingBucket(15)).toBe("15-30");
    expect(debtAgingBucket(29)).toBe("15-30");
  });
  it("30-60 ngày", () => {
    expect(debtAgingBucket(30)).toBe("30-60");
    expect(debtAgingBucket(59)).toBe("30-60");
  });
  it("trên 60 ngày", () => {
    expect(debtAgingBucket(60)).toBe("60+");
    expect(debtAgingBucket(999)).toBe("60+");
  });
});

describe("isOverThreshold", () => {
  it("vượt ngưỡng khi nợ ≥ ngưỡng", () => {
    expect(isOverThreshold(5_000_000, 5_000_000)).toBe(true);
    expect(isOverThreshold(4_999_999, 5_000_000)).toBe(false);
  });
  it("ngưỡng ≤ 0 coi như không cảnh báo", () => {
    expect(isOverThreshold(10_000_000, 0)).toBe(false);
  });
});
