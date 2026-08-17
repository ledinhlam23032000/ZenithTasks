import { describe, it, expect } from "vitest";
import { rfmScore, rfmSegment, isChurnRisk, funnelRates, marketingRoi, DEFAULT_RFM, type RfmThresholds } from "../analytics";

describe("rfmScore", () => {
  it("recency: gần đây→3, vừa→2, lâu→1 (theo ngưỡng mặc định 30/90)", () => {
    expect(rfmScore({ recencyDays: 10, frequency: 1, monetary: 0 }).r).toBe(3);
    expect(rfmScore({ recencyDays: 30, frequency: 1, monetary: 0 }).r).toBe(3);
    expect(rfmScore({ recencyDays: 60, frequency: 1, monetary: 0 }).r).toBe(2);
    expect(rfmScore({ recencyDays: 120, frequency: 1, monetary: 0 }).r).toBe(1);
  });
  it("frequency: ≥3→3, ≥2→2, else 1", () => {
    expect(rfmScore({ recencyDays: 0, frequency: 5, monetary: 0 }).f).toBe(3);
    expect(rfmScore({ recencyDays: 0, frequency: 2, monetary: 0 }).f).toBe(2);
    expect(rfmScore({ recencyDays: 0, frequency: 1, monetary: 0 }).f).toBe(1);
  });
  it("monetary: ≥20tr→3, ≥5tr→2, else 1", () => {
    expect(rfmScore({ recencyDays: 0, frequency: 1, monetary: 25_000_000 }).m).toBe(3);
    expect(rfmScore({ recencyDays: 0, frequency: 1, monetary: 5_000_000 }).m).toBe(2);
    expect(rfmScore({ recencyDays: 0, frequency: 1, monetary: 1_000_000 }).m).toBe(1);
  });
  it("dùng được ngưỡng tuỳ chỉnh", () => {
    const t: RfmThresholds = { recency: [7, 14], frequency: [5, 10], monetary: [1, 2] };
    expect(rfmScore({ recencyDays: 10, frequency: 6, monetary: 1 }, t)).toEqual({ r: 2, f: 2, m: 2 });
  });
});

describe("rfmSegment", () => {
  it("VIP: gần đây + chi nhiều/thường xuyên", () => {
    expect(rfmSegment({ r: 3, f: 3, m: 3 })).toBe("champion");
    expect(rfmSegment({ r: 3, f: 2, m: 3 })).toBe("champion");
  });
  it("nguy cơ rời bỏ: lâu chưa quay lại nhưng từng giá trị cao", () => {
    expect(rfmSegment({ r: 1, f: 3, m: 2 })).toBe("at_risk");
    expect(isChurnRisk(rfmSegment({ r: 1, f: 3, m: 2 }))).toBe(true);
  });
  it("đang ngủ: lâu chưa quay lại + giá trị thấp", () => {
    expect(rfmSegment({ r: 1, f: 1, m: 1 })).toBe("hibernating");
    expect(isChurnRisk(rfmSegment({ r: 1, f: 1, m: 1 }))).toBe(false);
  });
  it("trung thành: quay lại nhiều lần, còn tương đối gần", () => {
    expect(rfmSegment({ r: 2, f: 2, m: 1 })).toBe("loyal");
  });
  it("khách mới: gần đây, mới 1 lần", () => {
    expect(rfmSegment({ r: 3, f: 1, m: 1 })).toBe("new");
  });
  it("khác: r=2, f=1", () => {
    expect(rfmSegment({ r: 2, f: 1, m: 1 })).toBe("others");
  });
});

describe("funnelRates", () => {
  it("tính % so với bậc đầu và bậc liền trước", () => {
    const out = funnelRates([
      { label: "Hồ sơ", count: 100 },
      { label: "Tư vấn", count: 80 },
      { label: "Chốt", count: 40 },
    ]);
    expect(out[0]).toEqual({ label: "Hồ sơ", count: 100, pctOfTop: 100, pctOfPrev: 100 });
    expect(out[1]).toEqual({ label: "Tư vấn", count: 80, pctOfTop: 80, pctOfPrev: 80 });
    expect(out[2]).toEqual({ label: "Chốt", count: 40, pctOfTop: 40, pctOfPrev: 50 });
  });
  it("bậc đầu = 0 → tỉ lệ 0, không chia cho 0", () => {
    const out = funnelRates([
      { label: "A", count: 0 },
      { label: "B", count: 0 },
    ]);
    expect(out[1].pctOfTop).toBe(0);
    expect(out[1].pctOfPrev).toBe(0);
  });
});

describe("marketingRoi", () => {
  it("doanh thu / chi phí (làm tròn 1 số lẻ)", () => {
    expect(marketingRoi(32_000_000, 10_000_000)).toBe(3.2);
  });
  it("chưa có chi phí → null (không chia 0)", () => {
    expect(marketingRoi(5_000_000, 0)).toBeNull();
  });
});

describe("DEFAULT_RFM", () => {
  it("có đủ 3 ngưỡng", () => {
    expect(DEFAULT_RFM.recency).toHaveLength(2);
    expect(DEFAULT_RFM.frequency).toHaveLength(2);
    expect(DEFAULT_RFM.monetary).toHaveLength(2);
  });
});
