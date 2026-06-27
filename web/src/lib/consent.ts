// ============================================================================
// PHIẾU ĐỒNG Ý (B6 gđ2) — thay placeholder trong mẫu phiếu. Toán THUẦN (có test).
//
// Mẫu phiếu có thể chứa các placeholder, thay bằng dữ liệu hồ sơ khi ghi nhận:
//   {{ten}}    → tên khách
//   {{ngay}}   → ngày ký
//   {{dichvu}} → danh sách dịch vụ
//   {{mahoso}} → mã hồ sơ
// ============================================================================

export type ConsentVars = {
  customerName?: string;
  date?: string;
  services?: string;
  caseCode?: string;
};

export function fillConsentTemplate(body: string, vars: ConsentVars): string {
  return body
    .replaceAll("{{ten}}", vars.customerName ?? "")
    .replaceAll("{{ngay}}", vars.date ?? "")
    .replaceAll("{{dichvu}}", vars.services ?? "")
    .replaceAll("{{mahoso}}", vars.caseCode ?? "");
}

/** Các placeholder hỗ trợ (để hiển thị gợi ý cho người soạn mẫu). */
export const CONSENT_PLACEHOLDERS = ["{{ten}}", "{{ngay}}", "{{dichvu}}", "{{mahoso}}"] as const;
