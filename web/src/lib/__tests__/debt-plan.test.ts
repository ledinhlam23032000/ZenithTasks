import { describe, it, expect } from "vitest";
import { clampDayOfMonth, dueDateInMonth, nextDueDate, monthsToClear, duePeriods, expectedPaidByNow, debtPlanStatus } from "../debt-plan";

describe("clampDayOfMonth", () => {
  it("kẹp về 1..31", () => {
    expect(clampDayOfMonth(0)).toBe(1);
    expect(clampDayOfMonth(31)).toBe(31);
    expect(clampDayOfMonth(35)).toBe(31);
    expect(clampDayOfMonth(15)).toBe(15);
    expect(clampDayOfMonth(NaN)).toBe(1);
  });
});

describe("dueDateInMonth", () => {
  it("tháng đủ ngày → đúng ngày đó", () => {
    const d = dueDateInMonth(31, 2026, 0); // tháng 1 có 31 ngày
    expect(d.getDate()).toBe(31);
  });
  it("tháng thiếu ngày → lùi về ngày cuối tháng", () => {
    expect(dueDateInMonth(31, 2026, 1).getDate()).toBe(28); // 02/2026 không nhuận
    expect(dueDateInMonth(31, 2028, 1).getDate()).toBe(29); // 02/2028 nhuận
    expect(dueDateInMonth(31, 2026, 3).getDate()).toBe(30); // 04/2026 có 30 ngày
    expect(dueDateInMonth(30, 2026, 1).getDate()).toBe(28);
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
  it("ngày 31 ở tháng 30 ngày → cuối tháng này, không nhảy tháng sau", () => {
    const d = nextDueDate(31, new Date(2026, 3, 29)); // 29/04, tháng 4 có 30 ngày
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(30);
  });
  it("ngày 31 đã qua cuối tháng thiếu → sang ngày 31 tháng sau", () => {
    const d = nextDueDate(31, new Date(2026, 3, 30, 0, 0, 1)); // sau 30/04 0h? — 30/04 là đúng kỳ
    expect(d.getMonth()).toBe(3); // atMidnight(30/04) === kỳ 30/04 → vẫn hôm nay
    const d2 = nextDueDate(31, new Date(2026, 4, 1)); // 01/05
    expect(d2.getMonth()).toBe(4);
    expect(d2.getDate()).toBe(31);
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
  it("ngày 31: tháng thiếu vẫn tính kỳ vào ngày cuối tháng", () => {
    const p31 = { dayOfMonth: 31, monthlyAmount: 1_000_000, startDate: new Date(2026, 0, 31) };
    expect(duePeriods(p31, new Date(2026, 1, 27))).toBe(1); // 27/02 chưa tới 28/02
    expect(duePeriods(p31, new Date(2026, 1, 28))).toBe(2); // 28/02 (cuối tháng 2) = kỳ 2
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
