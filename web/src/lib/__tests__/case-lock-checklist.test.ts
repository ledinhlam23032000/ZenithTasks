import { describe, expect, it } from "vitest";
import { buildCaseLockChecklist, canLockCase } from "../case-lock-checklist";

const base = {
  customerName: "Nguyễn A",
  phoneLast5: "12345",
  consultationExists: true,
  patientConfirmed: true,
  serviceCount: 1,
  materialUsageCount: 0,
  consentCount: 0,
  documentCount: 0,
  financialAnomalyCount: 0,
};

describe("case lock checklist", () => {
  it("cho phép khóa khi các mục blocking hoàn tất dù vật tư chưa ghi", () => {
    const checklist = buildCaseLockChecklist(base);
    expect(canLockCase(checklist)).toBe(true);
    expect(checklist.find((item) => item.key === "materials")?.blocking).toBe(false);
    expect(checklist.find((item) => item.key === "materials")?.done).toBe(false);
  });

  it("chặn khóa nếu chưa xác nhận tư vấn hoặc chưa ghi dịch vụ", () => {
    const checklist = buildCaseLockChecklist({ ...base, patientConfirmed: false, serviceCount: 0 });
    expect(canLockCase(checklist)).toBe(false);
  });

  it("chặn khóa khi có bất thường tài chính", () => {
    const checklist = buildCaseLockChecklist({ ...base, financialAnomalyCount: 1 });
    expect(canLockCase(checklist)).toBe(false);
  });
});
