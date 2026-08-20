import { describe, expect, it } from "vitest";
import { getQuickStartItems } from "../quick-starts";

describe("getQuickStartItems", () => {
  it("returns role-visible quick starts when query is empty", () => {
    const items = getQuickStartItems(
      [
        { href: "/dashboard", label: "Tổng quan" },
        { href: "/viec-hom-nay", label: "Việc cần làm" },
        { href: "/lich-hen", label: "Lịch hẹn" },
        { href: "/khach-hang", label: "Hồ sơ khách hàng" },
      ],
      "",
    );

    expect(items.map((item) => item.title)).toEqual(["Việc cần làm", "Lịch hẹn", "Hồ sơ khách hàng"]);
    expect(items.every((item) => item.group === "Bắt đầu nhanh")).toBe(true);
  });

  it("returns no quick starts while searching", () => {
    expect(getQuickStartItems([{ href: "/viec-hom-nay", label: "Việc cần làm" }], "vi")).toEqual([]);
  });

  it("uses the effective nav label as a safe route-alias fallback", () => {
    const items = getQuickStartItems([{ href: "/today", label: "Việc cần làm" }], "");
    expect(items).toMatchObject([{ title: "Việc cần làm", href: "/today" }]);
  });

  it("never creates a quick start for a route absent from effective navigation", () => {
    expect(getQuickStartItems([{ href: "/dashboard", label: "Tổng quan" }], "")).toEqual([]);
  });
});
