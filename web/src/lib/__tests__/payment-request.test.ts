import { describe, expect, it } from "vitest";
import { amountInVietnameseWords, buildCashbookPaymentRequestDetails, linkedCashTransactionGuard, paymentRequestDocument, paymentRequestNo, paymentRequestStatusLabel, paymentRequestTypeLabel, renderPaymentRequestHtml } from "../payment-request";

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
  it("writes Vietnamese amount text and auto-fills the print document", () => {
    expect(amountInVietnameseWords(315000)).toBe("Ba trăm mười lăm nghìn đồng");
    const document = paymentRequestDocument({
      requestNo: "DNT-20260821-000001-ABCD",
      type: "EXPENSE",
      status: "PENDING",
      payeeName: "Nhà cung cấp",
      amount: 315000,
      reason: "Mua văn phòng phẩm",
      details: {
        recipient: "Ban lãnh đạo Bệnh viện",
        printOverrides: {
          requesterName: "Người nhập đã sửa",
          reason: "Nội dung đã được ADMIN rà soát",
          location: "Hải Phòng",
        },
      },
      month: "2026-08",
      requestedAt: new Date("2026-08-21T04:00:00Z"),
      requester: { fullName: "Nguyễn Văn A", address: null },
      approver: { fullName: "Lê Đình Lam" },
    });
    expect(document.recipient).toBe("Ban lãnh đạo Bệnh viện");
    expect(document.requesterName).toBe("Người nhập đã sửa");
    expect(document.requesterAddress).toBe("Trung tâm Phẫu thuật Tạo hình Thẩm mỹ");
    expect(document.reason).toBe("Nội dung đã được ADMIN rà soát");
    expect(document.amountText).toBe("Ba trăm mười lăm nghìn đồng");
    const html = renderPaymentRequestHtml(document, true);
    expect(html).toContain("GIẤY ĐỀ NGHỊ THANH TOÁN");
    expect(html).toContain("Ban lãnh đạo Bệnh viện");
    expect(html).toContain("Ba trăm mười lăm nghìn đồng");
    expect(html).toContain("Thủ trưởng đơn vị");
    expect(html).toContain("Kế toán trưởng");
    expect(html).toContain("Người đề nghị");
    expect(html).not.toContain("Lê Đình Lam");
  });
  it("blocks editing or deleting a cash row linked to a request", () => {
    expect(linkedCashTransactionGuard(null, "edit")).toBeNull();
    expect(linkedCashTransactionGuard("request-1", "edit")).toContain("sửa từ chứng từ");
    expect(linkedCashTransactionGuard("request-1", "delete")).toContain("Không thể xóa");
  });
});
