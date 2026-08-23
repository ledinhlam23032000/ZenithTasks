import { describe, expect, it } from "vitest";
import {
  CASH_AUTO_LOCK_MS,
  canDeleteCashTransaction,
  isCashTransactionAutoLocked,
} from "@/lib/cash-transaction-lock";

describe("cash transaction delete window", () => {
  const now = new Date("2026-08-23T16:00:00.000Z");
  const staff = { userId: "staff-1", role: "RECEPTION", createdById: "staff-1" };

  it("cho phép người nhập xóa trước đủ 24 giờ", () => {
    const createdAt = new Date(now.getTime() - CASH_AUTO_LOCK_MS + 1);

    expect(isCashTransactionAutoLocked(createdAt, now)).toBe(false);
    expect(canDeleteCashTransaction({ ...staff, createdAt, now })).toBe(true);
  });

  it("tự khóa đúng tại mốc 24 giờ và chặn nhân sự", () => {
    const createdAt = new Date(now.getTime() - CASH_AUTO_LOCK_MS);

    expect(isCashTransactionAutoLocked(createdAt, now)).toBe(true);
    expect(canDeleteCashTransaction({ ...staff, createdAt, now })).toBe(false);
  });

  it("không cho nhân sự xóa khoản do người khác nhập dù còn hạn", () => {
    const createdAt = new Date(now.getTime() - 60_000);

    expect(canDeleteCashTransaction({ ...staff, createdById: "staff-2", createdAt, now })).toBe(false);
  });

  it("cho ADMIN xóa không phụ thuộc người nhập và tuổi khoản", () => {
    const createdAt = new Date(now.getTime() - 30 * CASH_AUTO_LOCK_MS);

    expect(canDeleteCashTransaction({ userId: "admin-1", role: "ADMIN", createdById: "staff-2", createdAt, now })).toBe(true);
  });
});
