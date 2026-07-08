import { describe, it, expect } from "vitest";
import { userCan, diffFromDesired, navForUser } from "../permissions";

describe("userCan", () => {
  it("mặc định theo vai trò", () => {
    expect(userCan({ role: "ADMIN" }, "mod:nhan-su")).toBe(true);
    expect(userCan({ role: "RECEPTION" }, "mod:luong")).toBe(false);
  });
  it("grant cấp thêm quyền", () => {
    expect(userCan({ role: "RECEPTION", permissions: { grant: ["mod:luong"], deny: [] } }, "mod:luong")).toBe(true);
  });
  it("deny gỡ cả quyền mặc định", () => {
    expect(userCan({ role: "ADMIN", permissions: { grant: [], deny: ["mod:luong"] } }, "mod:luong")).toBe(false);
  });
  it("Trợ lý AI chỉ dành cho Admin và Cổ đông, grant không vượt được ranh giới", () => {
    expect(userCan({ role: "ADMIN" }, "mod:tro-ly")).toBe(true);
    expect(userCan({ role: "SHAREHOLDER" }, "mod:tro-ly")).toBe(true);
    expect(userCan({ role: "MANAGER", permissions: { grant: ["mod:tro-ly"], deny: [] } }, "mod:tro-ly")).toBe(false);
  });
  it("Trợ lý AI hiện thành mục điều hướng riêng cho Cổ đông", () => {
    const item = navForUser({ role: "SHAREHOLDER" }).find((nav) => nav.href === "/tro-ly");
    expect(item).toMatchObject({ label: "Trợ lý AI", group: "Trợ Lý" });
  });
  it("Kế hoạch dành cho Admin, Quản lý và Cổ đông (khác Trợ lý AI — có thêm Quản lý)", () => {
    expect(userCan({ role: "ADMIN" }, "mod:ke-hoach")).toBe(true);
    expect(userCan({ role: "MANAGER" }, "mod:ke-hoach")).toBe(true);
    expect(userCan({ role: "SHAREHOLDER" }, "mod:ke-hoach")).toBe(true);
  });
  it("Kế hoạch chặn cứng vai trò khác, grant không vượt được ranh giới", () => {
    expect(userCan({ role: "CONSULTANT", permissions: { grant: ["mod:ke-hoach"], deny: [] } }, "mod:ke-hoach")).toBe(false);
    expect(userCan({ role: "RECEPTION", permissions: { grant: ["mod:ke-hoach"], deny: [] } }, "mod:ke-hoach")).toBe(false);
  });
  it("Kế hoạch hiện thành mục điều hướng chung nhóm Trợ Lý với Trợ lý AI", () => {
    const item = navForUser({ role: "MANAGER" }).find((nav) => nav.href === "/ke-hoach");
    expect(item).toMatchObject({ label: "Kế hoạch", group: "Trợ Lý" });
  });
});

describe("diffFromDesired", () => {
  it("tính grant/deny so với mặc định vai trò", () => {
    const o = diffFromDesired("RECEPTION", ["mod:luong", "mod:tiep-nhan"]);
    expect(o.grant).toContain("mod:luong"); // không phải mặc định reception
    expect(o.deny).toContain("mod:dashboard"); // mặc định reception nhưng không chọn
    expect(o.deny).not.toContain("mod:tiep-nhan"); // vẫn giữ
  });
});
