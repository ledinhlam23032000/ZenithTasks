import { describe, it, expect } from "vitest";
import { splitCashflow, computePnl, type CashRow } from "../accounting";

describe("splitCashflow", () => {
  it("tách thu khác với khoản ứng từ doanh thu (không tính trùng doanh thu)", () => {
    const rows: CashRow[] = [
      { type: "INCOME", category: "SELL_PRODUCT", amount: 3_000_000 },
      { type: "INCOME", category: "ADVANCE_REVENUE", amount: 50_000_000 },
      { type: "INCOME", category: "SERVICE", amount: 10_000_000 }, // mã cũ, cũng là luân chuyển
    ];
    const s = splitCashflow(rows);
    expect(s.otherIncome).toBe(3_000_000);
    expect(s.transferIn).toBe(60_000_000);
  });

  it("loại lương & hoa hồng CTV khỏi chi vận hành", () => {
    const rows: CashRow[] = [
      { type: "EXPENSE", category: "MATERIAL", amount: 8_000_000 },
      { type: "EXPENSE", category: "RENT", amount: 20_000_000 },
      { type: "EXPENSE", category: "SALARY", amount: 90_000_000 },
      { type: "EXPENSE", category: "COMMISSION", amount: 12_000_000 },
    ];
    const s = splitCashflow(rows);
    expect(s.operatingExpense).toBe(28_000_000); // chỉ vật tư + mặt bằng
    expect(s.salaryPosted).toBe(90_000_000);
    expect(s.commissionPosted).toBe(12_000_000);
  });

  it("gộp chi theo hạng mục và xếp giảm dần", () => {
    const rows: CashRow[] = [
      { type: "EXPENSE", category: "MATERIAL", amount: 5_000_000 },
      { type: "EXPENSE", category: "RENT", amount: 20_000_000 },
      { type: "EXPENSE", category: "MATERIAL", amount: 3_000_000 },
    ];
    const s = splitCashflow(rows);
    expect(s.expenseByCategory).toEqual([
      { code: "RENT", amount: 20_000_000 },
      { code: "MATERIAL", amount: 8_000_000 },
    ]);
  });

  it("sổ rỗng → tất cả bằng 0", () => {
    const s = splitCashflow([]);
    expect(s).toMatchObject({ otherIncome: 0, transferIn: 0, operatingExpense: 0, salaryPosted: 0, commissionPosted: 0 });
    expect(s.expenseByCategory).toEqual([]);
  });
});

describe("computePnl", () => {
  it("lãi = tổng thu − (vận hành + lương + hoa hồng)", () => {
    const p = computePnl({
      serviceRevenue: 500_000_000,
      otherIncome: 20_000_000,
      operatingExpense: 100_000_000,
      salaryExpense: 200_000_000,
      ctvCommission: 30_000_000,
    });
    expect(p.totalIncome).toBe(520_000_000);
    expect(p.totalExpense).toBe(330_000_000);
    expect(p.profit).toBe(190_000_000);
    expect(p.margin).toBe(37); // 190/520 ≈ 36,5% → làm tròn 37
  });

  it("lỗ thì lãi âm và tỷ suất âm", () => {
    const p = computePnl({
      serviceRevenue: 100_000_000,
      otherIncome: 0,
      operatingExpense: 60_000_000,
      salaryExpense: 80_000_000,
      ctvCommission: 0,
    });
    expect(p.profit).toBe(-40_000_000);
    expect(p.margin).toBe(-40);
  });

  it("không có doanh thu → tỷ suất 0, không chia cho 0", () => {
    const p = computePnl({ serviceRevenue: 0, otherIncome: 0, operatingExpense: 5_000_000, salaryExpense: 0, ctvCommission: 0 });
    expect(p.profit).toBe(-5_000_000);
    expect(p.margin).toBe(0);
  });

  it("lương KHÔNG bị cộng hai lần khi đã ghi phiếu chi trong sổ thu chi", () => {
    // Kịch bản thật: bảng lương 200tr, đã bấm "Chi lương" → sổ thu chi có phiếu
    // chi SALARY 200tr. Chi vận hành phải KHÔNG chứa 200tr đó.
    const cash = splitCashflow([
      { type: "EXPENSE", category: "MATERIAL", amount: 100_000_000 },
      { type: "EXPENSE", category: "SALARY", amount: 200_000_000 },
    ]);
    const p = computePnl({
      serviceRevenue: 500_000_000,
      otherIncome: 0,
      operatingExpense: cash.operatingExpense,
      salaryExpense: 200_000_000,
      ctvCommission: 0,
    });
    expect(p.totalExpense).toBe(300_000_000); // 100tr vật tư + 200tr lương (một lần)
    expect(p.profit).toBe(200_000_000);
  });
});
