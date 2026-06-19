import { describe, it, expect, vi, afterEach } from "vitest";
import { generateSecret, totpVerify, otpauthURL } from "../totp";

afterEach(() => vi.useRealTimers());

describe("TOTP", () => {
  it("đúng vector RFC 6238 (SHA1, T=59 → 287082)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59 * 1000));
    // base32 của "12345678901234567890"
    expect(totpVerify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "287082")).toBe(true);
  });
  it("từ chối mã sai định dạng / sai số", () => {
    expect(totpVerify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "000")).toBe(false);
    expect(totpVerify("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "abcdef")).toBe(false);
  });
  it("generateSecret ra base32 đủ dài", () => {
    const s = generateSecret();
    expect(s.length).toBeGreaterThanOrEqual(16);
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });
  it("otpauthURL chứa secret + issuer", () => {
    const u = otpauthURL("ABC234", "letan");
    expect(u).toContain("otpauth://totp/");
    expect(u).toContain("secret=ABC234");
  });
});
