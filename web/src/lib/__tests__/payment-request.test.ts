import { describe, expect, it } from "vitest";
import { buildCashbookPaymentRequestDetails, linkedCashTransactionGuard, paymentRequestNo, paymentRequestStatusLabel, paymentRequestTypeLabel } from "../payment-request";

describe("payment request helpers", () => {
  it("creates a readable unique request number", () => {
    const value = paymentRequestNo(new Date("2026-08-18T10:11:12Z"));
    expect(value).toMatch(/^DNT-20260818-\d{6}-[A-Z0-9]{4}$/);
  });
  it("translates request types and statuses", () => {
    expect(paymentRequestTypeLabel("SALARY")).toBe("Chi lương nhân sự");
    expect(paymentRequestStatusLabel("PAID")).toBe("Đã thanh toán");
  });
  it("builds traceable details for a small cashbook expense", () => {
    const details = buildCashbookPaymentRequestDetails({ category: "OFFICE", note: "Mua gói tăm 3.000đ", occurredAt: new Date("2026-08-18T08:00:00Z"), method: "CASH", vendor: "Cửa hàng gần viện" });
    expect(details).toEqual({ category: "OFFICE", note: "Mua gói tăm 3.000đ", source: "THU_CHI", occurredAt: "2026-08-18T08:00:00.000Z", method: "CASH", vendor: "Cửa hàng gần viện" });
  });
  it("blocks editing or deleting a cash row linked to a request", () => {
    expect(linkedCashTransactionGuard(null, "edit")).toBeNull();
    expect(linkedCashTransactionGuard("request-1", "edit")).toContain("sửa từ chứng từ");
    expect(linkedCashTransactionGuard("request-1", "delete")).toContain("Không thể xóa");
  });
});
