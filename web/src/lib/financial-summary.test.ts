import { describe, expect, it } from "vitest";
import { summarizeCase, validatePaymentAmount, validateServicePrice } from "./financial-summary";

describe("summarizeCase", () => {
  it("sums services and payments from child records instead of a stale snapshot", () => {
    const summary = summarizeCase({
      services: [
        { listPrice: 20_000_000, unitPrice: 20_000_000, quantity: 1, discount: 0 },
        { listPrice: 10_000_000, unitPrice: 10_000_000, quantity: 1, discount: 0 },
      ],
      payments: [{ amount: 20_000_000 }, { amount: 10_000_000 }],
      voucherAmount: 0,
      snapshot: { totalAmount: 20_000_000, paidAmount: 30_000_000, debtAmount: 0 },
    });

    expect(summary.total).toBe(30_000_000);
    expect(summary.paid).toBe(30_000_000);
    expect(summary.debt).toBe(0);
    expect(summary.anomalies).toContain("STALE_SNAPSHOT");
  });

  it("uses the legacy listed price when an imported service has no unit price", () => {
    const summary = summarizeCase({
      services: [{ listPrice: 10_000_000, unitPrice: 0, quantity: 1, discount: 0 }],
      payments: [{ amount: 10_000_000 }],
      voucherAmount: 0,
    });

    expect(summary.total).toBe(10_000_000);
    expect(summary.paid).toBe(10_000_000);
    expect(summary.debt).toBe(0);
  });

  it("flags a payment when the case has no services", () => {
    const summary = summarizeCase({
      services: [],
      payments: [{ amount: 10_000_000 }],
      voucherAmount: 0,
    });

    expect(summary.total).toBe(0);
    expect(summary.paid).toBe(10_000_000);
    expect(summary.overpaid).toBe(10_000_000);
    expect(summary.anomalies).toContain("PAYMENT_WITHOUT_SERVICE");
    expect(summary.anomalies).toContain("OVERPAYMENT");
  });

  it("flags a line discount larger than the line value", () => {
    const summary = summarizeCase({
      services: [{ listPrice: 10_000_000, unitPrice: 10_000_000, quantity: 1, discount: 50_000_000 }],
      payments: [],
      voucherAmount: 0,
    });

    expect(summary.anomalies).toContain("INVALID_DISCOUNT");
  });

  it("rejects a payment when the case has no services", () => {
    expect(validatePaymentAmount({ amount: 10_000_000, total: 0, paid: 0 })).toEqual({
      ok: false,
      error: "Không thể ghi nhận thanh toán cho hồ sơ chưa có dịch vụ.",
    });
  });

  it("rejects a payment larger than the remaining debt", () => {
    expect(validatePaymentAmount({ amount: 10_000_001, total: 20_000_000, paid: 20_000_000 })).toEqual({
      ok: false,
      error: "Số tiền vượt quá công nợ còn lại của hồ sơ.",
    });
  });

  it("rejects a service discount larger than the line value", () => {
    expect(validateServicePrice({ unitPrice: 10_000_000, quantity: 1, discount: 10_000_001 })).toEqual({
      ok: false,
      error: "Mức giảm không được lớn hơn giá trị dịch vụ.",
    });
  });
});
