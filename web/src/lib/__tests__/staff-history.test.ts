import { describe, expect, it } from "vitest";
import { hasStaffHistory } from "../staff-history";

describe("hasStaffHistory", () => {
  it("cho phép xóa chỉ khi mọi quan hệ lịch sử đều rỗng", () => {
    expect(hasStaffHistory({ auditLogs: 0, attendance: 0, payroll: 0, staffAgreements: 0 })).toBe(false);
  });

  it("chặn xóa khi có chấm công hoặc lương", () => {
    expect(hasStaffHistory({ attendance: 1, payroll: 0 })).toBe(true);
    expect(hasStaffHistory({ attendance: 0, payroll: 1 })).toBe(true);
  });

  it("chặn xóa cả các lịch sử phụ trợ như thỏa thuận, AI, file hoặc thanh toán", () => {
    expect(hasStaffHistory({ staffAgreements: 1 })).toBe(true);
    expect(hasStaffHistory({ assistantFiles: 1 })).toBe(true);
    expect(hasStaffHistory({ payments: 1 })).toBe(true);
    expect(hasStaffHistory({ paymentRequestsPayee: 1 })).toBe(true);
  });
});
