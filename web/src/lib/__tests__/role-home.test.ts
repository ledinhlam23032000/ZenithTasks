import { describe, expect, it } from "vitest";
import { resolveRoleHome } from "../role-home";

describe("resolveRoleHome", () => {
  it("đưa lễ tân và telesale có quyền vào đầu ca", () => {
    expect(resolveRoleHome({ role: "RECEPTION" })).toBe("/dau-ca");
    expect(resolveRoleHome({ role: "TELESALE" })).toBe("/dau-ca");
  });

  it("đưa nhóm vận hành clinical/care vào việc cần làm", () => {
    expect(resolveRoleHome({ role: "CONSULTANT" })).toBe("/viec-hom-nay");
    expect(resolveRoleHome({ role: "DOCTOR" })).toBe("/viec-hom-nay");
    expect(resolveRoleHome({ role: "CARE" })).toBe("/viec-hom-nay");
  });

  it("đưa CTV vào cổng khách hàng và hoa hồng riêng", () => {
    expect(resolveRoleHome({ role: "COLLABORATOR" })).toBe("/cong-tac-vien-cua-toi");
  });

  it("giữ dashboard cho quản trị, quản lý, cổ đông và điều dưỡng", () => {
    expect(resolveRoleHome({ role: "ADMIN" })).toBe("/dashboard");
    expect(resolveRoleHome({ role: "MANAGER" })).toBe("/dashboard");
    expect(resolveRoleHome({ role: "SHAREHOLDER" })).toBe("/dashboard");
    expect(resolveRoleHome({ role: "NURSE" })).toBe("/dashboard");
  });

  it("rơi về dashboard khi grant/deny làm mất workspace khởi đầu", () => {
    expect(resolveRoleHome({ role: "RECEPTION", permissions: { grant: [], deny: ["mod:dau-ca"] } })).toBe("/dashboard");
    expect(resolveRoleHome({ role: "CONSULTANT", permissions: { grant: [], deny: ["mod:viec-hom-nay"] } })).toBe("/dashboard");
  });
});
