import { describe, it, expect } from "vitest";
import { fillConsentTemplate, CONSENT_PLACEHOLDERS } from "../consent";

describe("fillConsentTemplate", () => {
  it("thay tất cả placeholder", () => {
    const body = "Tôi {{ten}} đồng ý làm {{dichvu}} (hồ sơ {{mahoso}}) ngày {{ngay}}.";
    expect(
      fillConsentTemplate(body, { customerName: "Nguyễn A", date: "27/06/2026", services: "Nâng mũi", caseCode: "HS001" }),
    ).toBe("Tôi Nguyễn A đồng ý làm Nâng mũi (hồ sơ HS001) ngày 27/06/2026.");
  });
  it("thay nhiều lần cùng placeholder", () => {
    expect(fillConsentTemplate("{{ten}} - {{ten}}", { customerName: "B" })).toBe("B - B");
  });
  it("thiếu biến → thay bằng rỗng", () => {
    expect(fillConsentTemplate("Xin chào {{ten}}{{dichvu}}", {})).toBe("Xin chào ");
  });
  it("không có placeholder → giữ nguyên", () => {
    expect(fillConsentTemplate("Nội dung cố định.", { customerName: "X" })).toBe("Nội dung cố định.");
  });
});

describe("CONSENT_PLACEHOLDERS", () => {
  it("liệt kê đủ 4 placeholder", () => {
    expect(CONSENT_PLACEHOLDERS).toEqual(["{{ten}}", "{{ngay}}", "{{dichvu}}", "{{mahoso}}"]);
  });
});
