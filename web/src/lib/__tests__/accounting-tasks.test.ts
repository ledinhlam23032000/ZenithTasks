import { describe, it, expect } from "vitest";
import { buildAccountingTasks, isReadyToClose, type AccountingState } from "../accounting-tasks";

const BASE: AccountingState = {
  monthKey: "2026-06",
  isPastMonth: true,
  closed: false,
  hasData: true,
  salaryPayable: 100_000_000,
  salaryRemaining: 0,
  unpaidStaffCount: 0,
  ctvRemaining: 0,
  unpaidCtvCount: 0,
  salaryGap: 0,
  ctvGap: 0,
  missingAttendanceCount: 0,
};

const keys = (s: AccountingState) => buildAccountingTasks(s).map((t) => t.key);

describe("buildAccountingTasks", () => {
  it("sổ đã chốt → không còn việc gì", () => {
    expect(buildAccountingTasks({ ...BASE, closed: true, unpaidStaffCount: 3 })).toEqual([]);
  });

  it("tháng đã xong, mọi việc hoàn tất → chỉ nhắc chốt sổ", () => {
    expect(keys(BASE)).toEqual(["close"]);
    expect(buildAccountingTasks(BASE)[0].detail).toContain("Mọi việc đã xong");
    expect(buildAccountingTasks(BASE)[0].label).toBe("Tháng 06/2026 chưa chốt sổ");
  });

  it("tháng đang chạy → KHÔNG thúc chốt sổ", () => {
    expect(keys({ ...BASE, isPastMonth: false })).toEqual([]);
  });

  it("tháng trống (không phát sinh) → không nhắc chốt sổ", () => {
    expect(keys({ ...BASE, hasData: false })).toEqual([]);
  });

  it("còn người chưa chi lương → việc chặn, kèm số tiền", () => {
    const t = buildAccountingTasks({ ...BASE, unpaidStaffCount: 2, salaryRemaining: 36_000_000 });
    const salary = t.find((x) => x.key === "salary")!;
    expect(salary.blocking).toBe(true);
    expect(salary.label).toContain("2 người");
    expect(salary.label).toContain("36.000.000 ₫");
  });

  it("thiếu chấm công → cảnh báo vì lương cứng sẽ tính thiếu, nhưng KHÔNG chặn chốt sổ", () => {
    // Nhân sự nghỉ cả tháng vẫn hợp lệ là 0 ngày công → chặn sẽ không bao giờ chốt được sổ.
    const t = buildAccountingTasks({ ...BASE, missingAttendanceCount: 3 });
    expect(t[0].key).toBe("attendance");
    expect(t[0].blocking).toBe(false);
    expect(isReadyToClose({ ...BASE, missingAttendanceCount: 3 })).toBe(true);
  });

  it("lệch sổ → nhắc nhưng KHÔNG chặn chốt sổ (Lãi/Lỗ vẫn đúng)", () => {
    const t = buildAccountingTasks({ ...BASE, salaryGap: 5_000_000 });
    const gap = t.find((x) => x.key === "gap")!;
    expect(gap.blocking).toBe(false);
    expect(gap.label).toContain("5.000.000 ₫");
  });

  it("còn việc chặn → lời nhắc chốt sổ đổi giọng thành 'xử lý xong các việc trên'", () => {
    const t = buildAccountingTasks({ ...BASE, unpaidStaffCount: 1, salaryRemaining: 1_000_000 });
    expect(t.find((x) => x.key === "close")!.detail).toContain("Xử lý xong các việc trên");
  });
});

describe("isReadyToClose", () => {
  it("xong hết → sẵn sàng chốt", () => {
    expect(isReadyToClose(BASE)).toBe(true);
  });

  it("còn nợ lương → chưa sẵn sàng", () => {
    expect(isReadyToClose({ ...BASE, unpaidStaffCount: 1, salaryRemaining: 5_000_000 })).toBe(false);
  });

  it("lệch sổ KHÔNG chặn chốt (chỉ nhắc)", () => {
    expect(isReadyToClose({ ...BASE, salaryGap: 2_000_000 })).toBe(true);
  });

  it("tháng đang chạy / đã chốt → không đề xuất chốt", () => {
    expect(isReadyToClose({ ...BASE, isPastMonth: false })).toBe(false);
    expect(isReadyToClose({ ...BASE, closed: true })).toBe(false);
  });
});
