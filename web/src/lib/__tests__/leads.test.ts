import { describe, it, expect } from "vitest";
import { summarizeLeads, LEAD_STATUSES, LEAD_STATUS_LABEL } from "../leads";

describe("LEAD_STATUSES", () => {
  it("đủ 4 trạng thái + có nhãn", () => {
    expect(LEAD_STATUSES).toHaveLength(4);
    for (const s of LEAD_STATUSES) expect(LEAD_STATUS_LABEL[s]).toBeTruthy();
  });
});

describe("summarizeLeads", () => {
  it("rỗng → 0 hết, tỉ lệ 0", () => {
    const s = summarizeLeads([]);
    expect(s.total).toBe(0);
    expect(s.open).toBe(0);
    expect(s.conversionRate).toBe(0);
  });

  it("đếm theo trạng thái + tỉ lệ chuyển đổi + số còn theo đuổi", () => {
    const s = summarizeLeads([
      { status: "NEW" },
      { status: "NEW" },
      { status: "CONTACTED" },
      { status: "CONVERTED" },
      { status: "LOST" },
    ]);
    expect(s.total).toBe(5);
    expect(s.byStatus.NEW).toBe(2);
    expect(s.byStatus.CONTACTED).toBe(1);
    expect(s.byStatus.CONVERTED).toBe(1);
    expect(s.byStatus.LOST).toBe(1);
    expect(s.open).toBe(3); // NEW + CONTACTED
    expect(s.conversionRate).toBe(20); // 1/5
  });

  it("làm tròn tỉ lệ", () => {
    const s = summarizeLeads([{ status: "CONVERTED" }, { status: "NEW" }, { status: "NEW" }]);
    expect(s.conversionRate).toBe(33); // 1/3 ≈ 33%
  });
});
