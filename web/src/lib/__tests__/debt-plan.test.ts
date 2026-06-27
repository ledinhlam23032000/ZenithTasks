import { describe, it, expect } from "vitest";
import { clampDayOfMonth, nextDueDate, monthsToClear, duePeriods, expectedPaidByNow, debtPlanStatus } from "../debt-plan";

describe("clampDayOfMonth", () => {
  it("kẹp về 1..28", () => {
    expect(clampDayOfMonth(0)).toBe(1);
    expect(clampDayOfMonth(31)).toBe(28);
    expect(clampDayOfMonth(15)).toBe(15);
    expect(clampDayOfMonth(NaN)).toBe(1);
  });
});

describe("nextDueDate", () => {
  it("trong tháng, chưa qua ngày → ngày đó của tháng này", () => {
    const d = nextDueDate(10, new Date(2026, 5, 3)); // 03/06
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(10);
  });
  it("đã qua ngày → nhảy sang tháng sau", () => {
    const d = nextDueDate(10, new Date(2026, 5, 20)); // 20/06 > 10
    expect(d.getMonth()).toBe(6); // tháng 7
    expect(d.getDate()).toBe(10);
  });
  it("đúng ngày → là hôm nay", () => {
    const d = nextDueDate(10, new Date(2026, 5, 10));
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(10);
  });
});

describe("monthsToClear", () => {
  it("làm tròn lên", () => {
    expect(monthsToClear(10_000_000, 3_000_000)).toBe(4);
    expect(monthsToClear(9_000_000, 3_000_000)).toBe(3);
  });
  it("hết nợ → 0; chưa đặt tiền → Infinity", () => {
    expect(monthsToClear(0, 3_000_000)).toBe(0);
    expect(monthsToClear(5_000_000, 0)).toBe(Infinity);
  });
});

describe("duePeriods", () => {
  const plan = { dayOfMonth: 10, monthlyAmount: 2_000_000, startDate: new Date(2026, 0, 10) }; // 10/01/2026
  it("trước kỳ đầu → 0", () => {
    expect(duePeriods(plan, new Date(2025, 11, 31))).toBe(0);
  });
  it("đúng kỳ đầu → 1", () => {
    expect(duePeriods(plan, new Date(2026, 0, 10))).toBe(1);
  });
  it("qua vài kỳ → đếm đúng", () => {
    expect(duePeriods(plan, new Date(2026, 3, 9))).toBe(3); // tới 09/04: kỳ 1(10/1),2(10/2),3(10/3)
    expect(duePeriods(plan, new Date(2026, 3, 10))).toBe(4); // 10/04 → thêm kỳ 4
  });
});

describe("expectedPaidByNow", () => {
  const plan = { dayOfMonth: 10, monthlyAmount: 2_000_000, startDate: new Date(2026, 0, 10) };
  it("= số kỳ × tiền tháng, không vượt nợ gốc", () => {
    expect(expectedPaidByNow(plan, 10_000_000, new Date(2026, 3, 10))).toBe(8_000_000); // 4 kỳ × 2tr
    expect(expectedPaidByNow(plan, 5_000_000, new Date(2027, 0, 10))).toBe(5_000_000); // cap theo nợ gốc
  });
});

describe("debtPlanStatus", () => {
  const plan = { dayOfMonth: 10, monthlyAmount: 2_000_000, startDate: new Date(2026, 0, 10) };
  it("đúng hẹn → không chậm", () => {
    const s = debtPlanStatus(plan, { debtRemaining: 4_000_000, originalDebt: 10_000_000, paidSincePlan: 6_000_000, now: new Date(2026, 2, 15) });
    expect(s.isBehind).toBe(false);
    expect(s.behindAmount).toBe(0);
    expect(s.monthsLeft).toBe(2); // 4tr / 2tr
  });
  it("trả thiếu → báo chậm đúng số tiền", () => {
    // tới 15/03 đáng lẽ trả 3 kỳ = 6tr, mới trả 2tr → chậm 4tr
    const s = debtPlanStatus(plan, { debtRemaining: 8_000_000, originalDebt: 10_000_000, paidSincePlan: 2_000_000, now: new Date(2026, 2, 15) });
    expect(s.isBehind).toBe(true);
    expect(s.behindAmount).toBe(4_000_000);
  });
});
