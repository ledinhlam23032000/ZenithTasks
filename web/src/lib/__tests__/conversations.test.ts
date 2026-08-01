import { describe, it, expect } from "vitest";
import { withinResponseWindow, RESPONSE_WINDOW_HOURS } from "../channels/conversations";

describe("withinResponseWindow", () => {
  const now = new Date("2026-07-29T12:00:00Z");

  it("chưa có tin nào đến thì luôn NGOÀI khung giờ", () => {
    expect(withinResponseWindow("FACEBOOK", null, now)).toBe(false);
  });

  it("Facebook: còn trong 24h thì được phản hồi tự do", () => {
    const last = new Date(now.getTime() - 23 * 3_600_000);
    expect(withinResponseWindow("FACEBOOK", last, now)).toBe(true);
  });

  it("Facebook: quá 24h thì ngoài khung", () => {
    const last = new Date(now.getTime() - 25 * 3_600_000);
    expect(withinResponseWindow("FACEBOOK", last, now)).toBe(false);
  });

  it("Zalo OA: khung rộng hơn Facebook (48h)", () => {
    const last = new Date(now.getTime() - 40 * 3_600_000);
    expect(withinResponseWindow("ZALO_OA", last, now)).toBe(true);
    expect(RESPONSE_WINDOW_HOURS.ZALO_OA).toBeGreaterThan(RESPONSE_WINDOW_HOURS.FACEBOOK);
  });
});
