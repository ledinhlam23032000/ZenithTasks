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

  it("hard-deny SHAREHOLDER khỏi nội dung inbox dù được grant", () => {
    const shareholder = {
      role: "SHAREHOLDER" as const,
      permissions: { grant: ["inbox.view", "inbox.reply"], deny: [] },
    };

    expect(userCan(shareholder, "inbox.view")).toBe(false);
    expect(userCan(shareholder, "inbox.reply")).toBe(false);
  });

  it("cấp capability inbox đúng vai trò mặc định", () => {
    expect(userCan({ role: "CARE" }, "inbox.view")).toBe(true);
    expect(userCan({ role: "CARE" }, "inbox.reply")).toBe(true);
    expect(userCan({ role: "CARE" }, "inbox.manageChannels")).toBe(false);
    expect(userCan({ role: "ADMIN" }, "inbox.manageChannels")).toBe(true);
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
  it("gộp Nhật ký và Kết nối kênh vào mục Hệ thống trên sidebar", () => {
    const adminNav = navForUser({ role: "ADMIN" });
    expect(adminNav.find((nav) => nav.href === "/he-thong")).toMatchObject({ label: "Hệ thống", group: "Quản trị" });
    expect(adminNav.some((nav) => nav.href === "/nhat-ky")).toBe(false);
    expect(adminNav.some((nav) => nav.href === "/cham-soc/ket-noi")).toBe(false);
    expect(adminNav.some((nav) => nav.href === "/mau-phieu")).toBe(false);
  });
  it("giữ quyền server-side cho Nhật ký và Kết nối kênh, nhưng gỡ module Mẫu phiếu", () => {
    expect(userCan({ role: "ADMIN" }, "mod:nhat-ky")).toBe(true);
    expect(userCan({ role: "ADMIN" }, "mod:ket-noi-kenh")).toBe(true);
    expect(userCan({ role: "ADMIN" }, "mod:mau-phieu")).toBe(false);
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
