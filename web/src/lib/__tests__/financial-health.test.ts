import { describe, expect, it } from "vitest";
import { findFinancialIssues } from "../financial-health";

describe("financial health", () => {
  it("phát hiện snapshot lệch nhưng giữ số thật theo child records", () => {
    const issues = findFinancialIssues([{ caseId: "c1", caseCode: "HS0001", customerName: "Khách 1", services: [{ listPrice: 48_000_000, unitPrice: 48_000_000, quantity: 1, discount: 0, finalPrice: 48_000_000 }], payments: [{ amount: 10_000_000 }], snapshot: { totalAmount: 96_000_000, paidAmount: 10_000_000, debtAmount: 86_000_000 } }]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ anomaly: "STALE_SNAPSHOT", total: 48_000_000, debt: 38_000_000 });
  });

  it("phát hiện trả vượt và thanh toán không có dịch vụ", () => {
    const overpaid = findFinancialIssues([{ caseId: "c2", caseCode: "HS0002", customerName: "Khách 2", services: [{ unitPrice: 1_000_000, quantity: 1, discount: 0 }], payments: [{ amount: 1_500_000 }] }]);
    expect(overpaid.map((x) => x.anomaly)).toContain("OVERPAYMENT");
    const noService = findFinancialIssues([{ caseId: "c3", caseCode: "HS0003", customerName: "Khách 3", services: [], payments: [{ amount: 1_000_000 }] }]);
    expect(noService.map((x) => x.anomaly)).toContain("PAYMENT_WITHOUT_SERVICE");
  });
});
