import { describe, expect, it } from "vitest";
import { capabilitiesForRole, evaluateDispatcherAction, principalForUser, requestForAction } from "./ai-governance-adapter";

describe("AI dispatcher governance adapter", () => {
  it("does not make non-admin users equivalent to admin", () => {
    expect(capabilitiesForRole("MANAGER")).not.toContain("delete_customer");
    expect(capabilitiesForRole("ADMIN")).toContain("delete_customer");
  });

  it("requires confirmation and purpose for medical reads", () => {
    const principal = principalForUser({ id: "u1", role: "ADMIN" });
    const policy = evaluateDispatcherAction(principal, "get_customer_profile", { customerCode: "CUS-001" });
    expect(policy.decision).toBe("REQUIRE_CONFIRMATION");
    expect(policy.purposeRequired).toBe(true);
    expect(policy.allowedFields).toContain("diagnosis");
  });

  it("requires a two-person workflow for destructive customer deletion", () => {
    const principal = principalForUser({ id: "u1", role: "ADMIN" });
    const policy = evaluateDispatcherAction(principal, "delete_customer", { customerCode: "CUS-001" });
    expect(policy.decision).toBe("REQUIRE_APPROVAL");
    expect(policy.requiredApprovals).toBe(2);
    expect(policy.confirmationRequired).toBe(true);
  });

  it("denies a project-scoped request outside the principal project list", () => {
    const principal = principalForUser({ id: "u1", role: "ADMIN" }, ["project-a"]);
    const policy = evaluateDispatcherAction(principal, "get_business_summary", { projectId: "project-b" });
    expect(policy.decision).toBe("DENY");
    expect(policy.reason).toBe("PROJECT_SCOPE_DENIED");
  });

  it("marks payroll reads as sensitive and does not expose raw request arguments", () => {
    const principal = principalForUser({ id: "u1", role: "ADMIN" });
    const request = requestForAction("get_payroll_row", { staffName: "A", month: "2026-08" });
    const policy = evaluateDispatcherAction(principal, "get_payroll_row", { staffName: "A", month: "2026-08" });
    expect(request.includesPayrollData).toBe(true);
    expect(policy.decision).toBe("REQUIRE_CONFIRMATION");
    expect(policy.purposeRequired).toBe(true);
  });

  it("marks project-local payroll preview as sensitive too — không được bỏ sót", () => {
    // Hồi quy cho lỗ hổng có thật: get_project_payroll_preview trước đây thiếu
    // trong includesPayrollData nên rơi vào nhánh mặc định "read" -> L1/ALLOW,
    // đọc lương công ty mà không cần nêu mục đích hay xác nhận, dù đi đúng qua
    // governanceBlock (không phải chưa được gate — chỉ bị PHÂN LOẠI SAI).
    // getPrincipalForUserWorkspace (agent.ts) mở rộng capabilities cho project
    // workspace bằng get_project_payroll_preview; ở đây thêm tay để test đúng
    // lớp classification, không phụ thuộc hàm build principal của agent.ts.
    const basePrincipal = principalForUser({ id: "u1", role: "ADMIN" }, ["proj-1"], { workspaceKind: "PROJECT", projectId: "proj-1" });
    const principal = { ...basePrincipal, capabilities: [...basePrincipal.capabilities, "get_project_payroll_preview"] };
    const request = requestForAction("get_project_payroll_preview", { projectId: "proj-1" });
    const policy = evaluateDispatcherAction(principal, "get_project_payroll_preview", { projectId: "proj-1" });
    expect(request.includesPayrollData, "get_project_payroll_preview phải được đánh dấu nhạy cảm").toBe(true);
    expect(policy.decision, "phải yêu cầu xác nhận, không được ALLOW thẳng").toBe("REQUIRE_CONFIRMATION");
    expect(policy.purposeRequired).toBe(true);
  });
});
