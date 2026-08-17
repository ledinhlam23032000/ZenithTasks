import { describe, it, expect } from "vitest";
import { weightedAvgCost, stockValue, totalStockValue } from "../inventory-cost";

describe("weightedAvgCost — giá vốn bình quân gia quyền", () => {
  it("nhập lần đầu từ kho rỗng = đơn giá nhập", () => {
    expect(weightedAvgCost({ oldStock: 0, oldAvg: 0, inQty: 10, inUnitCost: 500000 })).toBe(500000);
  });

  it("bình quân khi nhập thêm giá khác", () => {
    // 10 @ 500k + 10 @ 700k = 20 @ 600k
    expect(weightedAvgCost({ oldStock: 10, oldAvg: 500000, inQty: 10, inUnitCost: 700000 })).toBe(600000);
  });

  it("nhập không khai báo giá (0) → giữ nguyên giá vốn cũ", () => {
    expect(weightedAvgCost({ oldStock: 10, oldAvg: 500000, inQty: 5, inUnitCost: 0 })).toBe(500000);
  });

  it("giá vốn cũ = 0 (chưa từng ghi giá) + nhập có giá → LẤY luôn giá nhập (không pha loãng)", () => {
    // tồn cũ "giá 0" = chưa biết giá → adopt 600k
    expect(weightedAvgCost({ oldStock: 10, oldAvg: 0, inQty: 10, inUnitCost: 600000 })).toBe(600000);
  });

  it("làm tròn tới đồng (2 chữ số thập phân)", () => {
    // (3*100 + 1*101)/4 = 100.25
    expect(weightedAvgCost({ oldStock: 3, oldAvg: 100, inQty: 1, inUnitCost: 101 })).toBe(100.25);
  });

  it("chống số âm đầu vào", () => {
    expect(weightedAvgCost({ oldStock: -5, oldAvg: -1, inQty: 4, inUnitCost: 200000 })).toBe(200000);
  });
});

describe("stockValue / totalStockValue — giá trị tồn kho", () => {
  it("giá trị 1 mặt hàng = tồn × giá vốn", () => {
    expect(stockValue(47, 500000)).toBe(23500000);
  });

  it("tồn âm coi như 0", () => {
    expect(stockValue(-3, 500000)).toBe(0);
  });

  it("tổng nhiều mặt hàng", () => {
    expect(
      totalStockValue([
        { stock: 10, avgCost: 500000 },
        { stock: 5, avgCost: 200000 },
        { stock: 0, avgCost: 999999 },
      ]),
    ).toBe(6000000);
  });
});
