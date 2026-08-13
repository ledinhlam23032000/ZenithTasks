import { describe, expect, it } from "vitest";
import { requiresTwoFactor } from "../security-policy";

describe("requiresTwoFactor", () => {
  it("bắt buộc 2FA với nhóm có quyền nhạy cảm", () => {
    expect(requiresTwoFactor({ role: "ADMIN" })).toBe(true);
    expect(requiresTwoFactor({ role: "MANAGER" })).toBe(true);
    expect(requiresTwoFactor({ role: "DOCTOR" })).toBe(true);
    expect(requiresTwoFactor({ role: "CONSULTANT", permissions: { grant: ["financial.detail.read"] } })).toBe(true);
  });

  it("không bắt buộc 2FA cho vai trò không có quyền nhạy cảm mặc định", () => {
    expect(requiresTwoFactor({ role: "RECEPTION" })).toBe(false);
    expect(requiresTwoFactor({ role: "CARE" })).toBe(false);
  });
});
