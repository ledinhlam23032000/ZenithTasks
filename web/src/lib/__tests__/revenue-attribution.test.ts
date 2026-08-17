import { describe, expect, it } from "vitest";
import { attributeCaseRevenue, summarizeStaffRevenue, validateAllocations } from "../revenue-attribution";

describe("revenue attribution", () => {
  it("không đếm đôi hồ sơ khi một người kiêm tư vấn viên và bác sĩ", () => {
    const rows = attributeCaseRevenue({ caseId: "case-48", totalRevenue: 48_000_000, consultantId: "u1", doctorId: "u1" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: "u1", amount: 48_000_000, source: "LEGACY_DEDUPED", shareBps: 10_000 });
    expect(summarizeStaffRevenue([{ caseId: "case-48", totalRevenue: 48_000_000, consultantId: "u1", doctorId: "u1" }]).get("u1")).toMatchObject({ totalRevenue: 48_000_000, allocatedRevenue: 48_000_000 });
  });

  it("chia doanh số phối hợp 60/40 đúng tổng doanh thu", () => {
    const allocations = [
      { userId: "consultant", role: "CONSULTANT" as const, shareBps: 6_000 },
      { userId: "doctor", role: "DOCTOR" as const, shareBps: 4_000 },
    ];
    expect(validateAllocations(allocations)).toEqual({ ok: true, totalShareBps: 10_000 });
    const rows = attributeCaseRevenue({ caseId: "case-split", totalRevenue: 48_000_000, consultantId: "consultant", doctorId: "doctor", allocations });
    expect(rows.map((r) => r.amount)).toEqual([28_800_000, 19_200_000]);
    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(48_000_000);
  });

  it("xử lý phần dư làm tròn ở allocation cuối", () => {
    const allocations = [
      { userId: "a", role: "CONSULTANT" as const, shareBps: 3_333 },
      { userId: "b", role: "DOCTOR" as const, shareBps: 3_333 },
      { userId: "c", role: "NURSE" as const, shareBps: 3_334 },
    ];
    const rows = attributeCaseRevenue({ caseId: "case-round", totalRevenue: 101, consultantId: null, doctorId: null, allocations });
    expect(rows.map((r) => r.amount)).toEqual([33, 33, 35]);
    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(101);
  });

  it("chặn phân bổ vượt hoặc thiếu 100% khi hồ sơ bắt buộc đủ", () => {
    expect(validateAllocations([{ userId: "a", role: "CONSULTANT", shareBps: 10_001 }])).toMatchObject({ ok: false });
    expect(validateAllocations([{ userId: "a", role: "CONSULTANT", shareBps: 5_000 }])).toMatchObject({ ok: false, totalShareBps: 5_000 });
    expect(validateAllocations([{ userId: "a", role: "CONSULTANT", shareBps: 5_000 }], false)).toEqual({ ok: true, totalShareBps: 5_000 });
  });

  it("giữ tương thích cũ cho hai nhân sự khác vai trò khi chưa có split", () => {
    const rows = attributeCaseRevenue({ caseId: "legacy", totalRevenue: 48_000_000, consultantId: "u1", doctorId: "u2" });
    expect(rows.map((r) => r.userId)).toEqual(["u1", "u2"]);
    expect(rows.every((r) => r.amount === 48_000_000 && r.source === "LEGACY_ROLE")).toBe(true);
  });
});
