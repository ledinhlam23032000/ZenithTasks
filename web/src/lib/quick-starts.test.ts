import { describe, expect, it } from "vitest";
import { getAliasItems, getQuickStartItems } from "./quick-starts";

describe("quick-start aliases", () => {
  const nav = [
    { href: "/dashboard", label: "Tổng quan" },
    { href: "/khach-hang", label: "Hồ sơ khách hàng" },
    { href: "/ke-toan", label: "Kế toán" },
    { href: "/cham-soc", label: "Chăm sóc KH" },
    { href: "/lich-hen", label: "Lịch hẹn" },
  ];

  it("resolves Vietnamese business aliases to permitted parent routes", () => {
    expect(getAliasItems(nav, "hồ sơ điều trị").map((item) => item.href)).toContain("/khach-hang");
    expect(getAliasItems(nav, "đề nghị thanh toán").map((item) => item.href)).toContain("/ke-toan/de-nghi-thanh-toan");
    expect(getAliasItems(nav, "hộp thư").map((item) => item.href)).toContain("/cham-soc/hop-thu");
  });

  it("does not expose aliases when the parent module is absent", () => {
    expect(getAliasItems([{ href: "/dashboard", label: "Tổng quan" }], "đề nghị thanh toán")).toEqual([]);
  });

  it("keeps quick-start list useful with an empty query", () => {
    expect(getQuickStartItems(nav, "").map((item) => item.title)).toEqual([
      "Lịch hẹn",
      "Hồ sơ khách hàng",
      "Đề nghị thanh toán",
      "Hộp thư CSKH",
    ]);
  });
});
