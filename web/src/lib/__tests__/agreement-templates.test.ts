import { describe, expect, it } from "vitest";
import { agreementTitle, buildAgreementTemplate } from "../agreement-templates";

describe("agreement templates", () => {
  const staff = { fullName: "Nguyễn Văn A", nationalId: "123", position: "Tư vấn viên" };
  it("builds confidentiality snapshot with staff and company", () => {
    const text = buildAgreementTemplate("CONFIDENTIALITY", staff);
    expect(agreementTitle("CONFIDENTIALITY")).toContain("BẢO MẬT");
    expect(text).toContain("Nguyễn Văn A");
    expect(text).toContain("Bệnh Viện Đa Khoa Hồng Phúc");
    expect(text).toContain("72 tháng");
  });
  it("keeps non-compete template marked for legal review", () => {
    const text = buildAgreementTemplate("NON_COMPETE", staff);
    expect(text).toContain("15 km");
    expect(text).toContain("rà soát pháp lý");
  });
});
