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
});

describe("diffFromDesired", () => {
  it("tính grant/deny so với mặc định vai trò", () => {
    const o = diffFromDesired("RECEPTION", ["mod:luong", "mod:tiep-nhan"]);
    expect(o.grant).toContain("mod:luong"); // không phải mặc định reception
    expect(o.deny).toContain("mod:dashboard"); // mặc định reception nhưng không chọn
    expect(o.deny).not.toContain("mod:tiep-nhan"); // vẫn giữ
  });
});
