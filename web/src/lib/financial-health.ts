import { summarizeCase, type FinancialAnomaly, type FinancialServiceInput, type FinancialPaymentInput } from "./financial-summary";

export type FinancialHealthInput = {
  caseId: string;
  caseCode: string;
  customerName: string;
  services: FinancialServiceInput[];
  payments: FinancialPaymentInput[];
  voucherAmount?: unknown;
  snapshot?: { totalAmount?: unknown; paidAmount?: unknown; debtAmount?: unknown };
};

export type FinancialHealthItem = {
  caseId: string;
  caseCode: string;
  customerName: string;
  anomaly: FinancialAnomaly;
  message: string;
  total: number;
  paid: number;
  debt: number;
};

const LABELS: Record<FinancialAnomaly, string> = {
  STALE_SNAPSHOT: "Tổng lưu trên hồ sơ không khớp với chi tiết dịch vụ/thanh toán.",
  PAYMENT_WITHOUT_SERVICE: "Có thanh toán nhưng chưa có dịch vụ trong hồ sơ.",
  OVERPAYMENT: "Số đã thu lớn hơn thành tiền hồ sơ.",
  INVALID_DISCOUNT: "Có dòng dịch vụ giảm giá không hợp lệ.",
  INVALID_VOUCHER: "Voucher vượt quá giá trị hồ sơ hoặc không hợp lệ.",
  INVALID_PAYMENT: "Có khoản thanh toán không hợp lệ.",
};

export function findFinancialIssues(inputs: FinancialHealthInput[]): FinancialHealthItem[] {
  const out: FinancialHealthItem[] = [];
  for (const input of inputs) {
    const summary = summarizeCase(input);
    for (const anomaly of summary.anomalies) {
      out.push({ caseId: input.caseId, caseCode: input.caseCode, customerName: input.customerName, anomaly, message: LABELS[anomaly], total: summary.total, paid: summary.paid, debt: summary.debt });
    }
  }
  return out;
}
