import { describe, it, expect } from "vitest";
import { tplDebtReminder, tplFollowUpReminder, tplApptConfirm, tplBirthday, tplWinback } from "../message-templates";

describe("message-templates — mẫu tin nhắn", () => {
  it("nhắc công nợ có tên, mã hồ sơ, số tiền định dạng VND", () => {
    const s = tplDebtReminder({ fullName: "Nguyễn Thị A", debtAmount: 1500000, caseCode: "HS000123" });
    expect(s).toContain("Nguyễn Thị A");
    expect(s).toContain("HS000123");
    expect(s).toContain("1.500.000đ");
  });

  it("nhắc tái khám có thời điểm", () => {
    const s = tplFollowUpReminder({ fullName: "B", whenLabel: "09:00 ngày 30/06" });
    expect(s).toContain("B");
    expect(s).toContain("09:00 ngày 30/06");
  });

  it("xác nhận lịch hẹn có thời điểm", () => {
    const s = tplApptConfirm({ fullName: "C", whenLabel: "14:00 ngày 01/07" });
    expect(s).toContain("14:00 ngày 01/07");
  });

  it("sinh nhật có tên", () => {
    expect(tplBirthday({ fullName: "D" })).toContain("D");
  });

  it("khách nguội có tên", () => {
    expect(tplWinback({ fullName: "E" })).toContain("E");
  });
});
