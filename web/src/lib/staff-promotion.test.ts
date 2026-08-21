import { describe, expect, it } from "vitest";
import { promotionChanged, promotionDiff, resolveEffectiveDate } from "./staff-promotion";

describe("staff promotion", () => {
  it("detects role, position and department changes", () => {
    const current = { role: "CONSULTANT" as const, position: "Tư vấn viên", department: "Kinh doanh" };
    const next = { role: "MANAGER" as const, position: "Trưởng nhóm", department: "Vận hành" };
    expect(promotionChanged(current, next)).toBe(true);
    expect(promotionDiff(current, next)).toEqual({
      fromRole: "CONSULTANT",
      toRole: "MANAGER",
      fromPosition: "Tư vấn viên",
      toPosition: "Trưởng nhóm",
      fromDepartment: "Kinh doanh",
      toDepartment: "Vận hành",
    });
  });

  it("uses the requested effective date and falls back safely", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    expect(resolveEffectiveDate("2026-09-01T00:00:00.000Z", now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(resolveEffectiveDate("not-a-date", now)).toBe(now);
  });
});
