import { format } from "date-fns";

export const PAYMENT_REQUEST_TYPE_LABEL: Record<string, string> = {
  EXPENSE: "Chi phí vận hành",
  SALARY: "Chi lương nhân sự",
  COLLABORATOR: "Hoa hồng cộng tác viên",
  STAFF_OTHER: "Khoản chi khác cho nhân sự",
};

export const PAYMENT_REQUEST_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export function paymentRequestNo(now = new Date()): string {
  const stamp = format(now, "yyyyMMdd-HHmmss");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DNT-${stamp}-${suffix}`;
}

export function paymentRequestTypeLabel(type: string): string {
  return PAYMENT_REQUEST_TYPE_LABEL[type] ?? type;
}

export function paymentRequestStatusLabel(status: string): string {
  return PAYMENT_REQUEST_STATUS_LABEL[status] ?? status;
}

export type CashbookPaymentRequestDetails = {
  category: string;
  note?: string | null;
  occurredAt: Date;
  method: string;
  vendor?: string | null;
};

/** Metadata lưu trên PaymentRequest khi phiếu được khởi tạo từ Sổ thu–chi. */
export function buildCashbookPaymentRequestDetails(input: CashbookPaymentRequestDetails) {
  return {
    category: input.category,
    note: input.note || null,
    source: "THU_CHI",
    occurredAt: input.occurredAt.toISOString(),
    method: input.method,
    vendor: input.vendor || null,
  } as const;
}

/** Dòng tiền đã gắn chứng từ phải được sửa/xóa từ chứng từ gốc để tránh lệch sổ. */
export function linkedCashTransactionGuard(paymentRequestId: string | null | undefined, operation: "edit" | "delete") {
  if (!paymentRequestId) return null;
  return operation === "edit"
    ? "Dòng thu–chi này đã gắn với Đề nghị thanh toán; hãy sửa từ chứng từ để không lệch sổ."
    : "Không thể xóa dòng thu–chi đã liên kết Đề nghị thanh toán; hãy xử lý từ chứng từ gốc.";
}
