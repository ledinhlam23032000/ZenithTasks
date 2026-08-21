import { describe, expect, it } from "vitest";
import { canTransitionPaymentRequest, paymentRequestTransitionError } from "../payment-request";

describe("payment request state machine", () => {
  it("cho phép PENDING → APPROVED → PAID", () => {
    expect(canTransitionPaymentRequest("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionPaymentRequest("APPROVED", "PAID")).toBe(true);
  });

  it("không cho sửa ngược phiếu đã thanh toán", () => {
    expect(canTransitionPaymentRequest("PAID", "APPROVED")).toBe(false);
    expect(paymentRequestTransitionError("PAID", "APPROVED")).toContain("Không thể chuyển");
  });

  it("từ chối bắt buộc đi từ PENDING", () => {
    expect(canTransitionPaymentRequest("DRAFT", "REJECTED")).toBe(false);
    expect(canTransitionPaymentRequest("PENDING", "REJECTED")).toBe(true);
  });
});
