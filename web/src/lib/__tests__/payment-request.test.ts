import { describe, expect, it } from "vitest";
import { paymentRequestNo, paymentRequestStatusLabel, paymentRequestTypeLabel } from "../payment-request";

describe("payment request helpers", () => {
  it("creates a readable unique request number", () => {
    const value = paymentRequestNo(new Date("2026-08-18T10:11:12Z"));
    expect(value).toMatch(/^DNT-20260818-\d{6}-[A-Z0-9]{4}$/);
  });
  it("translates request types and statuses", () => {
    expect(paymentRequestTypeLabel("SALARY")).toBe("Chi lương nhân sự");
    expect(paymentRequestStatusLabel("PAID")).toBe("Đã thanh toán");
  });
});
