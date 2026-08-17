import { describe, it, expect } from "vitest";
import { validStockInLines, parseStockInLines, stockInTotal, type StockInLine } from "../stock-in";

describe("validStockInLines", () => {
  it("bỏ dòng thiếu vật tư hoặc SL ≤ 0", () => {
    const lines: StockInLine[] = [
      { materialId: "m1", quantity: 5, unitCost: 1000 },
      { materialId: "", quantity: 3, unitCost: 0 }, // thiếu vật tư → bỏ
      { materialId: "m2", quantity: 0, unitCost: 500 }, // SL 0 → bỏ
      { materialId: "m3", quantity: 2, unitCost: 0 }, // hợp lệ (không khai giá)
    ];
    expect(validStockInLines(lines).map((l) => l.materialId)).toEqual(["m1", "m3"]);
  });
  it("đơn giá âm → kẹp về 0", () => {
    expect(validStockInLines([{ materialId: "m1", quantity: 1, unitCost: -9 }])[0].unitCost).toBe(0);
  });
});

describe("parseStockInLines", () => {
  it("gộp 3 mảng song song + lọc hợp lệ", () => {
    const out = parseStockInLines(["m1", "", "m2"], [10, 5, 3], [1000, 0, 2000]);
    expect(out).toEqual([
      { materialId: "m1", quantity: 10, unitCost: 1000 },
      { materialId: "m2", quantity: 3, unitCost: 2000 },
    ]);
  });
  it("chuỗi rỗng/không hợp lệ → 0", () => {
    const out = parseStockInLines(["m1"], [Number.NaN], [Number.NaN]);
    expect(out).toEqual([]); // quantity NaN → 0 → bỏ
  });
});

describe("stockInTotal", () => {
  it("tổng SL × đơn giá", () => {
    expect(stockInTotal([
      { materialId: "m1", quantity: 10, unitCost: 1000 },
      { materialId: "m2", quantity: 3, unitCost: 2000 },
    ])).toBe(16000);
  });
});
