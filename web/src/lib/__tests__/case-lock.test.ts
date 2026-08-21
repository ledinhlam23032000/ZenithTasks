import { describe, expect, it } from "vitest";
import { CASE_AUTO_LOCK_MS, isCaseAutoLocked } from "../case-lock";

describe("case auto-lock", () => {
  const now = new Date("2026-08-21T12:00:00.000Z");

  it("chưa khóa trước khi đủ 24 giờ", () => {
    expect(isCaseAutoLocked(new Date(now.getTime() - CASE_AUTO_LOCK_MS + 1), now)).toBe(false);
  });

  it("khóa đúng từ mốc 24 giờ", () => {
    expect(isCaseAutoLocked(new Date(now.getTime() - CASE_AUTO_LOCK_MS), now)).toBe(true);
  });

  it("khóa khi đã quá 24 giờ và nhận ISO timestamp", () => {
    expect(isCaseAutoLocked(new Date(now.getTime() - CASE_AUTO_LOCK_MS - 1).toISOString(), now)).toBe(true);
  });

  it("không tự khóa khi timestamp không hợp lệ", () => {
    expect(isCaseAutoLocked("not-a-date", now)).toBe(false);
  });
});
