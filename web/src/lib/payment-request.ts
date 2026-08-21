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

export const PAYMENT_REQUEST_DEFAULT_RECIPIENT = "Ban lãnh đạo Bệnh viện";
export const PAYMENT_REQUEST_HOSPITAL = "BỆNH VIỆN ĐA KHOA HỒNG PHÚC";
export const PAYMENT_REQUEST_UNIT = "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ";
export const PAYMENT_REQUEST_HOSPITAL_ADDRESS = "Số 5 Hồ Xuân Hương, Hồng Bàng, Hải Phòng";
export const PAYMENT_REQUEST_LOCATION = "Hải Phòng";

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

const SMALL_NUMBER_WORDS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigits(value: number, forceHundreds: boolean): string {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  const parts: string[] = [];

  if (hundreds > 0 || forceHundreds) {
    parts.push(`${SMALL_NUMBER_WORDS[hundreds]} trăm`);
  }
  if (tens === 0) {
    if (units > 0 && (hundreds > 0 || forceHundreds)) parts.push("lẻ");
    if (units > 0) parts.push(SMALL_NUMBER_WORDS[units]);
  } else if (tens === 1) {
    parts.push("mười");
    if (units === 1) parts.push("một");
    else if (units === 4) parts.push("bốn");
    else if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(SMALL_NUMBER_WORDS[units]);
  } else {
    parts.push(`${SMALL_NUMBER_WORDS[tens]} mươi`);
    if (units === 1) parts.push("mốt");
    else if (units === 4) parts.push("tư");
    else if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(SMALL_NUMBER_WORDS[units]);
  }
  return parts.join(" ");
}

/** Đổi số tiền VND nguyên dương sang chữ tiếng Việt để in trên phiếu. */
export function amountInVietnameseWords(value: number): string {
  const amount = Math.round(Math.abs(value));
  if (!Number.isFinite(amount) || amount === 0) return "Không đồng";

  const groups = [
    { value: Math.floor(amount / 1_000_000_000), scale: "tỷ" },
    { value: Math.floor((amount % 1_000_000_000) / 1_000_000), scale: "triệu" },
    { value: Math.floor((amount % 1_000_000) / 1_000), scale: "nghìn" },
    { value: amount % 1_000, scale: "" },
  ];
  const parts: string[] = [];
  let hasHigherGroup = false;
  for (const group of groups) {
    if (group.value === 0) continue;
    parts.push(readThreeDigits(group.value, hasHigherGroup && group.value < 100), group.scale);
    hasHigherGroup = true;
  }
  const sentence = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type PaymentRequestRecordForPrint = {
  requestNo: string;
  type: string;
  status: string;
  payeeName: string;
  amount: unknown;
  reason: string;
  details: unknown;
  month?: string | null;
  requestedAt: Date;
  paidAt?: Date | null;
  requester: { fullName: string; address?: string | null };
  approver?: { fullName: string } | null;
};

export type PaymentRequestDocument = {
  requestNo: string;
  recipient: string;
  requesterName: string;
  requesterAddress: string;
  reason: string;
  amount: number;
  amountText: string;
  requestDate: Date;
  location: string;
  approverName: string;
  status: string;
};

export function paymentRequestDocument(item: PaymentRequestRecordForPrint): PaymentRequestDocument {
  const details = asRecord(item.details);
  const printOverrides = asRecord(details.printOverrides);
  const textOverride = (key: string, fallback: string) => {
    const value = printOverrides[key];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  const amount = Math.round(Number(item.amount) || 0);
  const recipient = textOverride("recipient", typeof details.recipient === "string" && details.recipient.trim() ? details.recipient : PAYMENT_REQUEST_DEFAULT_RECIPIENT);
  const requesterName = textOverride("requesterName", item.requester.fullName);
  const requesterAddress = textOverride("requesterAddress", item.requester.address?.trim() || PAYMENT_REQUEST_UNIT);
  const reason = textOverride("reason", item.reason.trim() || (typeof details.note === "string" ? details.note : "Đề nghị thanh toán khoản chi phát sinh"));
  const location = textOverride("location", PAYMENT_REQUEST_LOCATION);
  return {
    requestNo: item.requestNo,
    recipient,
    requesterName,
    requesterAddress,
    reason,
    amount,
    amountText: amountInVietnameseWords(amount),
    requestDate: item.requestedAt,
    location,
    approverName: "",
    status: item.status,
  };
}

export const PAYMENT_REQUEST_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2f7; color: #111827; font-family: "Times New Roman", Times, serif; }
  .payment-paper { width: 100%; max-width: 794px; min-height: 1123px; margin: 0 auto; padding: 26px 34px 30px; background: #fff; }
  .payment-header { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; text-align: center; font-size: 15px; line-height: 1.35; }
  .payment-header strong { font-weight: 700; }
  .payment-header small { font-size: 12px; }
  .payment-header-right { font-weight: 700; }
  .payment-header-right em { display: block; font-weight: 700; text-decoration: underline; }
  .payment-title { margin: 45px 0 18px; text-align: center; font-size: 25px; font-weight: 700; }
  .payment-number { margin: -10px 0 22px; text-align: center; font-size: 11px; color: #64748b; letter-spacing: .04em; }
  .payment-field { display: grid; grid-template-columns: 116px 16px minmax(0, 1fr); align-items: end; min-height: 31px; font-size: 17px; line-height: 1.45; }
  .payment-field-label { white-space: nowrap; }
  .payment-field-value { min-width: 0; min-height: 25px; padding: 0 0 4px; }
  .payment-value-text { display: inline; padding: 0 5px 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .payment-field-long { min-height: 42px; align-items: start; }
  .payment-field-long .payment-field-value { padding-top: 2px; line-height: 1.55; }
  .payment-date { margin: 18px 0 22px; text-align: right; font-size: 16px; font-style: italic; }
  .payment-signatures { width: 100%; table-layout: fixed; border-collapse: collapse; text-align: center; }
  .payment-signatures td { width: 25%; padding: 0 5px; vertical-align: top; font-size: 16px; font-weight: 700; }
  .payment-signatures .hint { display: block; margin-top: 8px; font-weight: 400; font-size: 15px; }
  .payment-signatures .signed-name { display: block; min-height: 74px; padding-top: 32px; font-size: 13px; font-weight: 400; color: #475569; }
  .payment-screen-actions { max-width: 794px; margin: 18px auto; display: flex; justify-content: flex-end; gap: 8px; font-family: system-ui, sans-serif; }
  @media print {
    body { background: #fff; }
    .payment-screen-actions { display: none !important; }
    .payment-paper { max-width: none; min-height: 0; padding: 0; }
  }
`;

export function renderPaymentRequestPaper(document: PaymentRequestDocument): string {
  const dateText = format(document.requestDate, "dd/MM/yyyy");
  return `<section class="payment-paper">
  <header class="payment-header">
    <div><strong>${PAYMENT_REQUEST_HOSPITAL}</strong><br><small>${PAYMENT_REQUEST_HOSPITAL_ADDRESS}</small></div>
    <div class="payment-header-right">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br><em>Độc lập - Tự do - Hạnh phúc</em></div>
  </header>
  <h1 class="payment-title">GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
  <div class="payment-number">Số phiếu: ${escapeHtml(document.requestNo)} · ${escapeHtml(paymentRequestStatusLabel(document.status))}</div>
  <div class="payment-field"><span class="payment-field-label">Kính gửi</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(document.recipient)}</span></span></div>
  <div class="payment-field"><span class="payment-field-label">Họ và Tên</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(document.requesterName)}</span></span></div>
  <div class="payment-field"><span class="payment-field-label">Địa chỉ</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(document.requesterAddress)}</span></span></div>
  <div class="payment-field payment-field-long"><span class="payment-field-label">Lý do</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(document.reason)}</span></span></div>
  <div class="payment-field"><span class="payment-field-label">Số tiền</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(new Intl.NumberFormat("vi-VN").format(document.amount))} đồng</span></span></div>
  <div class="payment-field payment-field-long"><span class="payment-field-label">Bằng chữ</span><span>:</span><span class="payment-field-value"><span class="payment-value-text">${escapeHtml(document.amountText)}</span></span></div>
  <p class="payment-date">${escapeHtml(document.location)}, ngày ${escapeHtml(dateText)}</p>
  <table class="payment-signatures"><tbody><tr>
    <td>Thủ trưởng đơn vị<span class="hint">(Ký, họ tên)</span><span class="signed-name"></span></td>
    <td>Kế toán trưởng<span class="hint">(Ký, họ tên)</span><span class="signed-name"></span></td>
    <td>Kế toán<span class="hint">(Ký, họ tên)</span><span class="signed-name"></span></td>
    <td>Người đề nghị<span class="hint">(Ký, họ tên)</span><span class="signed-name"></span></td>
  </tr></tbody></table>
</section>`;
}

export function renderPaymentRequestHtml(document: PaymentRequestDocument, includeScreenActions = false): string {
  const actions = includeScreenActions
    ? `<div class="payment-screen-actions"><button onclick="window.print()">In / Lưu PDF</button></div>`
    : "";
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Giấy đề nghị thanh toán ${escapeHtml(document.requestNo)}</title><style>${PAYMENT_REQUEST_PRINT_CSS}.payment-screen-actions button{border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:8px 14px;font-weight:600;cursor:pointer}</style></head><body>${actions}${renderPaymentRequestPaper(document)}</body></html>`;
}
