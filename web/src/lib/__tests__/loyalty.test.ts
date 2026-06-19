import { describe, it, expect } from "vitest";
import { tierFor, pointsFor, nextTier } from "../loyalty";

describe("hạng thành viên", () => {
  it("theo tổng chi tiêu", () => {
    expect(tierFor(0).key).toBe("MEMBER");
    expect(tierFor(10_000_000).key).toBe("SILVER");
    expect(tierFor(30_000_000).key).toBe("GOLD");
    expect(tierFor(85_000_000).key).toBe("DIAMOND");
  });
  it("điểm = chi tiêu / 100.000", () => {
    expect(pointsFor(350_000)).toBe(3);
    expect(pointsFor(0)).toBe(0);
  });
  it("hạng kế tiếp", () => {
    expect(nextTier(0)?.key).toBe("SILVER");
    expect(nextTier(999_000_000)).toBeNull();
  });
});
