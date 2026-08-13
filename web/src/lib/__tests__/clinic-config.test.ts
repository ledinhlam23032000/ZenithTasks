import { describe, expect, it } from "vitest";
import { clinicConfigSchema, DEFAULT_CLINIC_CONFIG } from "../clinic-config";

describe("clinic config", () => {
  it("có cấu hình mặc định hợp lệ", () => {
    expect(clinicConfigSchema.parse(DEFAULT_CLINIC_CONFIG)).toMatchObject({ brandName: DEFAULT_CLINIC_CONFIG.brandName });
  });

  it("chặn màu không phải mã hex và email sai", () => {
    expect(clinicConfigSchema.safeParse({ ...DEFAULT_CLINIC_CONFIG, primaryColor: "red" }).success).toBe(false);
    expect(clinicConfigSchema.safeParse({ ...DEFAULT_CLINIC_CONFIG, email: "not-email" }).success).toBe(false);
  });
});
