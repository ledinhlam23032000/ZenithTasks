import { describe, it, expect } from "vitest";
import { vnDateOnly } from "../dates";

describe("vnDateOnly", () => {
  it("chốt về đúng nửa đêm UTC của ngày dương lịch VN", () => {
    // 31/07 17:00 giờ VN = 31/07 10:00 UTC -> vẫn là ngày 31/7 theo lịch VN
    const d = vnDateOnly(new Date("2026-07-31T10:00:00.000Z"));
    expect(d.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("qua nửa đêm VN thì chuyển sang ngày hôm sau dù còn trong ngày UTC trước", () => {
    // 31/07 17:00 UTC = 01/08 00:00 giờ VN -> đã là ngày 1/8 theo lịch VN
    const d = vnDateOnly(new Date("2026-07-31T17:00:00.000Z"));
    expect(d.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("khử lệch của startOfMonth() khi tính theo giờ LOCAL rồi quy ra UTC", () => {
    // Nếu máy chủ chạy giờ VN (+7), startOfMonth() cho tháng 8 trả về mốc tuyệt đối
    // "01/08 00:00 VN" = "31/07 17:00 UTC" — so trực tiếp mốc này với cột @db.Date sẽ
    // khiến ngày 31/7 lẫn vào tháng 8 (Postgres/Prisma cắt về đúng NGÀY theo giờ UTC
    // của phiên). vnDateOnly() phải khử lệch này, trả về đúng "01/08 00:00 UTC".
    const buggyStartOfMonth = new Date("2026-07-31T17:00:00.000Z");
    const fixed = vnDateOnly(buggyStartOfMonth);
    expect(fixed.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("khử lệch của endOfMonth() — vẫn đúng ngày cuối tháng, không nhảy sang tháng sau", () => {
    // "31/08 23:59:59.999 VN" = "31/08 16:59:59.999 UTC"
    const buggyEndOfMonth = new Date("2026-08-31T16:59:59.999Z");
    const fixed = vnDateOnly(buggyEndOfMonth);
    expect(fixed.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});
