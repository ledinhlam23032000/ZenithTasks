import { describe, it, expect } from "vitest";
import { splitCashflow, computePnl, type PnlTxn } from "../pnl";

const TRANSFER = ["ADVANCE_REVENUE", "SERVICE"];

describe("splitCashflow", () => {
  it("sổ rỗng → tất cả bằng 0", () => {
    const s = splitCashflow([], TRANSFER);
    expect(s).toMatchObject({ otherIncome: 0, transferIn: 0, operatingExpense: 0, salaryPosted: 0, commissionPosted: 0 });
    expect(s.expenseByCategory).toEqual([]);
  });

  it("BỎ thu thuộc mã chuyển/ứng doanh thu khỏi 'thu khác' (tránh tính trùng)", () => {
    const txns: PnlTxn[] = [
      { type: "INCOME", category: "ADVANCE_REVENUE", amount: 9_000_000 }, // luân chuyển
      { type: "INCOME", category: "SERVICE", amount: 1_000_000 }, // luân chuyển (mã cũ)
      { type: "INCOME", category: "INTEREST", amount: 500_000 }, // thu nhập thật
    ];
    const s = splitCashflow(txns, TRANSFER);
    expect(s.otherIncome).toBe(500_000);
    expect(s.transferIn).toBe(10_000_000);
  });

  it("category null không lẫn vào transferCodes", () => {
    const s = splitCashflow([{ type: "INCOME", category: null, amount: 700_000 }], TRANSFER);
    expect(s.otherIncome).toBe(700_000);
  });

  it("LOẠI lương & hoa hồng CTV khỏi chi vận hành (lấy từ bảng lương thay thế)", () => {
    const txns: PnlTxn[] = [
      { type: "EXPENSE", category: "RENT", amount: 5_000_000 },
      { type: "EXPENSE", category: "MATERIAL", amount: 3_000_000 },
      { type: "EXPENSE", category: "SALARY", amount: 90_000_000 },
      { type: "EXPENSE", category: "COMMISSION", amount: 12_000_000 },
    ];
    const s = splitCashflow(txns, TRANSFER);
    expect(s.operatingExpense).toBe(8_000_000); // chỉ mặt bằng + vật tư
    expect(s.salaryPosted).toBe(90_000_000);
    expect(s.commissionPosted).toBe(12_000_000);
  });

  it("gộp chi theo hạng mục và xếp giảm dần", () => {
    const txns: PnlTxn[] = [
      { type: "EXPENSE", category: "MATERIAL", amount: 5_000_000 },
      { type: "EXPENSE", category: "RENT", amount: 20_000_000 },
      { type: "EXPENSE", category: "MATERIAL", amount: 3_000_000 },
    ];
    expect(splitCashflow(txns, TRANSFER).expenseByCategory).toEqual([
      { code: "RENT", amount: 20_000_000 },
      { code: "MATERIAL", amount: 8_000_000 },
    ]);
  });
});

describe("computePnl", () => {
  const ZERO = { serviceRevenue: 0, otherIncome: 0, operatingExpense: 0, salaryExpense: 0, ctvCommission: 0 };

  it("không chi gì → lãi = doanh thu dịch vụ", () => {
    const p = computePnl({ ...ZERO, serviceRevenue: 10_000_000 });
    expect(p).toMatchObject({ serviceRevenue: 10_000_000, otherIncome: 0, totalExpense: 0, profit: 10_000_000 });
  });

  it("cộng thu khác, trừ đủ 3 nhóm chi", () => {
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

  it("lỗ khi chi vượt thu", () => {
    const p = computePnl({ ...ZERO, serviceRevenue: 1_000_000, operatingExpense: 5_000_000 });
    expect(p.profit).toBe(-4_000_000);
    expect(p.margin).toBe(-400);
  });

  it("không có doanh thu → tỷ suất 0, không chia cho 0", () => {
    const p = computePnl({ ...ZERO, operatingExpense: 5_000_000 });
    expect(p.profit).toBe(-5_000_000);
    expect(p.margin).toBe(0);
  });

  it("lương KHÔNG bị cộng hai lần khi đã ghi phiếu chi trong sổ thu chi", () => {
    // Kịch bản thật: bảng lương 200tr, đã bấm "Chi lương" → sổ thu chi có phiếu
    // chi SALARY 200tr. Chi vận hành phải KHÔNG chứa 200tr đó.
    const cash = splitCashflow(
      [
        { type: "EXPENSE", category: "MATERIAL", amount: 100_000_000 },
        { type: "EXPENSE", category: "SALARY", amount: 200_000_000 },
      ],
      TRANSFER,
    );
    const p = computePnl({
      serviceRevenue: 500_000_000,
      otherIncome: 0,
      operatingExpense: cash.operatingExpense,
      salaryExpense: 200_000_000, // từ bảng lương
      ctvCommission: 0,
    });
    expect(p.totalExpense).toBe(300_000_000); // 100tr vật tư + 200tr lương (một lần)
    expect(p.profit).toBe(200_000_000);
  });
});
