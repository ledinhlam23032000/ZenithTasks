import { describe, it, expect } from "vitest";
import { computeCaseTotals } from "../case-math";

describe("computeCaseTotals — toán tiền hồ sơ", () => {
  it("hồ sơ rỗng = 0 hết", () => {
    expect(computeCaseTotals({ finalPrices: [], discounts: [], voucherAmount: 0, payments: [] })).toEqual({
      total: 0,
      discount: 0,
      paid: 0,
      debt: 0,
    });
  });

  it("một dịch vụ, chưa trả → nợ = tổng", () => {
    const r = computeCaseTotals({ finalPrices: [30_000_000], discounts: [0], voucherAmount: 0, payments: [] });
    expect(r.total).toBe(30_000_000);
    expect(r.debt).toBe(30_000_000);
    expect(r.paid).toBe(0);
  });

  it("ví dụ tài liệu: 30tr giảm 5tr (đã vào finalPrice) → trả 20tr → nợ 5tr", () => {
    // finalPrice đã trừ giảm: 25tr; discount tổng hợp = 5tr (chỉ để hiển thị)
    const r = computeCaseTotals({ finalPrices: [25_000_000], discounts: [5_000_000], voucherAmount: 0, payments: [20_000_000] });
    expect(r.total).toBe(25_000_000);
    expect(r.discount).toBe(5_000_000);
    expect(r.paid).toBe(20_000_000);
    expect(r.debt).toBe(5_000_000);
  });

  it("voucher giảm tổng (net) và công nợ", () => {
    const r = computeCaseTotals({ finalPrices: [10_000_000, 5_000_000], discounts: [0, 0], voucherAmount: 3_000_000, payments: [2_000_000] });
    expect(r.total).toBe(12_000_000); // 15tr − 3tr voucher
    expect(r.debt).toBe(10_000_000); // 12tr − 2tr đã trả
  });

  it("voucher không vượt quá tổng (kẹp)", () => {
    const r = computeCaseTotals({ finalPrices: [5_000_000], discounts: [0], voucherAmount: 9_000_000, payments: [] });
    expect(r.total).toBe(0); // voucher kẹp = subtotal
    expect(r.debt).toBe(0);
  });

  it("trả dư KHÔNG tạo nợ âm", () => {
    const r = computeCaseTotals({ finalPrices: [10_000_000], discounts: [0], voucherAmount: 0, payments: [12_000_000] });
    expect(r.paid).toBe(12_000_000);
    expect(r.debt).toBe(0);
  });

  it("nhiều khoản thu cộng dồn", () => {
    const r = computeCaseTotals({ finalPrices: [10_000_000], discounts: [0], voucherAmount: 0, payments: [3_000_000, 4_000_000] });
    expect(r.paid).toBe(7_000_000);
    expect(r.debt).toBe(3_000_000);
  });

  it("bỏ qua giá trị không hợp lệ (NaN)", () => {
    const r = computeCaseTotals({ finalPrices: [10_000_000, NaN], discounts: [0], voucherAmount: NaN, payments: [NaN, 1_000_000] });
    expect(r.total).toBe(10_000_000);
    expect(r.paid).toBe(1_000_000);
    expect(r.debt).toBe(9_000_000);
  });
});
