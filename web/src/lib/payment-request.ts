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
