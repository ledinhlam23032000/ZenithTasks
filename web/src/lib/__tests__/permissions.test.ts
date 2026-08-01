import { describe, it, expect } from "vitest";
import { userCan, diffFromDesired } from "../permissions";

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
});

describe("diffFromDesired", () => {
  it("tính grant/deny so với mặc định vai trò", () => {
    const o = diffFromDesired("RECEPTION", ["mod:luong", "mod:tiep-nhan"]);
    expect(o.grant).toContain("mod:luong"); // không phải mặc định reception
    expect(o.deny).toContain("mod:dashboard"); // mặc định reception nhưng không chọn
    expect(o.deny).not.toContain("mod:tiep-nhan"); // vẫn giữ
  });
});
