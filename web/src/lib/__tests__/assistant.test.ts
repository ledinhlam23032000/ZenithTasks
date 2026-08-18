import { describe, it, expect } from "vitest";
import { BUSINESS_RULES_KNOWLEDGE, formatAssistantContext, type AssistantContext } from "../assistant";

const ctx: AssistantContext = {
  today: "29/06/2026",
  periodDays: 30,
  revenue: 123_000_000,
  newCustomers: 12,
  newCases: 15,
  appointmentsToday: 4,
  followUpsNext7: 3,
  debtTotal: 37_500_000,
  debtCount: 2,
  topDebtors: [{ name: "Đỗ Đức Chiến", amount: 23_000_000 }],
  topServices: [{ name: "Nâng mũi", count: 5, revenue: 80_000_000 }],
  segments: { champion: 2, loyal: 3, new: 10, at_risk: 1, hibernating: 0, others: 4 },
  churnRiskCount: 1,
  churnTop: [{ name: "Nguyễn Thị Hà", monetary: 30_000_000, recencyDays: 120 }],
  lowStock: [{ name: "Botox", stock: 2, minStock: 5, unit: "lọ" }],
  leads: { total: 8, open: 5, converted: 2, conversionRate: 25 },
  marketing: { spend: 10_000_000, revenue: 50_000_000, roi: 5 },
};

describe("formatAssistantContext", () => {
  const txt = formatAssistantContext(ctx);

  it("có các mục chính", () => {
    for (const h of ["TỔNG QUAN", "CÔNG NỢ", "DỊCH VỤ BÁN CHẠY", "KHÁCH HÀNG", "KHÁCH THAM KHẢO", "KHO VẬT TƯ", "MARKETING"]) {
      expect(txt).toContain(h);
    }
  });

  it("hiện số tiền có định dạng nghìn + đ", () => {
    expect(txt).toContain("123.000.000đ");
    expect(txt).toContain("Đỗ Đức Chiến");
  });

  it("hiện đúng phân khúc + tỉ lệ chuyển đổi leads", () => {
    expect(txt).toContain("Nguy cơ rời bỏ: 1");
    expect(txt).toContain("tỉ lệ chuyển đổi: 25%");
  });

  it("ROI hiển thị số lần khi có chi phí", () => {
    expect(txt).toContain("ROI: 5.0 lần");
  });

  it("ROI báo chưa tính được khi null", () => {
    const t2 = formatAssistantContext({ ...ctx, marketing: { spend: 0, revenue: 0, roi: null } });
    expect(t2).toContain("chưa tính được");
  });

  it("kho: thông báo khi không có vật tư dưới ngưỡng", () => {
    const t3 = formatAssistantContext({ ...ctx, lowStock: [] });
    expect(t3).toContain("Không có vật tư dưới mức tồn tối thiểu");
  });

  it("kho kiến thức có bản đồ vận hành và chứng từ nhỏ", () => {
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("BẢN ĐỒ VẬN HÀNH HỆ THỐNG");
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("gói tăm 3.000đ");
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("Một PaymentRequest chỉ được liên kết tối đa một CashTransaction");
  });

  it("ghi nhận registry AI mới và các chốt an toàn", () => {
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("đọc hồ sơ khách theo mã");
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("cập nhật Sổ tư vấn theo rule 24 giờ");
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("PENDING → APPROVED → PAID");
    expect(BUSINESS_RULES_KNOWLEDGE).toContain("hoàn kho vật tư trước rồi mới xóa trong transaction");
  });
});
