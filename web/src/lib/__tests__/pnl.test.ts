import { describe, it, expect } from "vitest";
import { computePnl, type PnlTxn } from "../pnl";

const TRANSFER = ["ADVANCE_REVENUE", "SERVICE"];

describe("computePnl", () => {
  it("không giao dịch nào → lãi = doanh thu dịch vụ", () => {
    expect(computePnl(10_000_000, [])).toEqual({
      serviceRevenue: 10_000_000,
      otherIncome: 0,
      totalExpense: 0,
      profit: 10_000_000,
    });
  });

  it("cộng thu khác, trừ chi", () => {
    const txns: PnlTxn[] = [
      { type: "INCOME", category: "OTHER", amount: 2_000_000 },
      { type: "EXPENSE", category: "RENT", amount: 5_000_000 },
      { type: "EXPENSE", category: "SALARY", amount: 3_000_000 },
    ];
    const p = computePnl(10_000_000, txns, TRANSFER);
    expect(p.otherIncome).toBe(2_000_000);
    expect(p.totalExpense).toBe(8_000_000);
    expect(p.profit).toBe(10_000_000 + 2_000_000 - 8_000_000); // 4tr
  });

  it("BỎ thu thuộc mã chuyển/ứng doanh thu (tránh tính trùng)", () => {
    const txns: PnlTxn[] = [
      { type: "INCOME", category: "ADVANCE_REVENUE", amount: 9_000_000 }, // bị loại
      { type: "INCOME", category: "SERVICE", amount: 1_000_000 }, // bị loại
      { type: "INCOME", category: "INTEREST", amount: 500_000 }, // tính
    ];
    const p = computePnl(0, txns, TRANSFER);
    expect(p.otherIncome).toBe(500_000);
    expect(p.profit).toBe(500_000);
  });

  it("category null không lẫn vào transferCodes", () => {
    const p = computePnl(0, [{ type: "INCOME", category: null, amount: 700_000 }], TRANSFER);
    expect(p.otherIncome).toBe(700_000);
  });

  it("lỗ khi chi vượt thu", () => {
    const p = computePnl(1_000_000, [{ type: "EXPENSE", category: "RENT", amount: 5_000_000 }], TRANSFER);
    expect(p.profit).toBe(-4_000_000);
  });
});
