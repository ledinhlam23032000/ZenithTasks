import { describe, it, expect } from "vitest";
import { clampScore, npsCategory, npsSummary } from "../nps";

describe("clampScore", () => {
  it("kẹp về 0..10 + làm tròn", () => {
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(12)).toBe(10);
    expect(clampScore(7.6)).toBe(8);
    expect(clampScore(NaN)).toBe(0);
  });
});

describe("npsCategory", () => {
  it("0–6 detractor, 7–8 passive, 9–10 promoter", () => {
    expect(npsCategory(0)).toBe("detractor");
    expect(npsCategory(6)).toBe("detractor");
    expect(npsCategory(7)).toBe("passive");
    expect(npsCategory(8)).toBe("passive");
    expect(npsCategory(9)).toBe("promoter");
    expect(npsCategory(10)).toBe("promoter");
  });
});

describe("npsSummary", () => {
  it("rỗng → 0 hết", () => {
    expect(npsSummary([])).toEqual({ count: 0, score: 0, promoters: 0, passives: 0, detractors: 0, average: 0 });
  });

  it("tính NPS = %promoter − %detractor", () => {
    // 6 promoter, 2 passive, 2 detractor (n=10) → 60% − 20% = 40
    const s = npsSummary([10, 10, 9, 9, 9, 10, 8, 7, 3, 0]);
    expect(s.count).toBe(10);
    expect(s.promoters).toBe(6);
    expect(s.passives).toBe(2);
    expect(s.detractors).toBe(2);
    expect(s.score).toBe(40);
  });

  it("điểm trung bình 1 chữ số thập phân", () => {
    const s = npsSummary([10, 9, 8]); // tb = 9
    expect(s.average).toBe(9);
    const s2 = npsSummary([10, 9]); // 9.5
    expect(s2.average).toBe(9.5);
  });

  it("toàn promoter → 100; toàn detractor → −100", () => {
    expect(npsSummary([9, 10, 10]).score).toBe(100);
    expect(npsSummary([0, 3, 6]).score).toBe(-100);
  });
});
