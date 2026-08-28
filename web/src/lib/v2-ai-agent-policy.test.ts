import { describe, expect, it } from "vitest";
import { evaluateAiAgentRequest, type AiAgentCaller, type AiAgentDescriptor } from "./v2-ai-agent-policy";

const child: AiAgentDescriptor = { kind: "CHILD", status: "ACTIVE", projectId: "company-a", toolAllowlist: ["read_customers"] };
const global: AiAgentDescriptor = { kind: "GLOBAL", status: "ACTIVE", projectId: null, toolAllowlist: ["get_workspace_overview", "read_customers"] };
const memberA: AiAgentCaller = { role: "COLLABORATOR", accessibleProjectIds: ["company-a"], memberships: [{ projectId: "company-a", active: true, capabilities: ["workspace.view"] }] };
const admin: AiAgentCaller = { role: "ADMIN", accessibleProjectIds: ["company-a", "company-b"], memberships: [] };

const childRequest = { workspaceKind: "PROJECT" as const, projectId: "company-a", toolName: "read_customers", action: "read_customers" };

describe("AI agent runtime policy", () => {
  it("allows an ACTIVE child only for its own active member workspace", () => {
    expect(evaluateAiAgentRequest(child, memberA, childRequest)).toEqual({ ok: true, scope: "CHILD", projectId: "company-a" });
    expect(evaluateAiAgentRequest(child, memberA, { ...childRequest, projectId: "company-b" })).toEqual({ ok: false, reason: "AGENT_PROJECT_MISMATCH" });
    expect(evaluateAiAgentRequest(child, memberA, { ...childRequest, workspaceKind: "INTERNAL" })).toEqual({ ok: false, reason: "AGENT_KIND_SCOPE_MISMATCH" });
    expect(evaluateAiAgentRequest(child, admin, childRequest)).toEqual({ ok: true, scope: "CHILD", projectId: "company-a" });
  });

  it("requires ACTIVE status and an allowlisted action", () => {
    expect(evaluateAiAgentRequest({ ...child, status: "DRAFT" }, memberA, childRequest)).toEqual({ ok: false, reason: "AGENT_NOT_ACTIVE" });
    // Thẩm quyền nằm ở `action` — đó mới là thứ dispatchJobTool thực thi.
    expect(evaluateAiAgentRequest(child, memberA, { ...childRequest, action: "get_payroll" })).toEqual({ ok: false, reason: "TOOL_NOT_ALLOWLISTED" });
  });

  it("toolName KHÔNG cấp quyền: action ngoài allowlist vẫn bị chặn dù toolName hợp lệ", () => {
    // Hồi quy cho lỗ leo thang quyền có thật: gate cũ chỉ kiểm `toolName`, nên gửi
    // toolName allowlisted kèm action ghi dữ liệu là qua cửa. `toolName` nay chỉ là
    // nhãn mô tả, không được dùng làm căn cứ phân quyền.
    expect(
      evaluateAiAgentRequest(child, memberA, { ...childRequest, toolName: "read_customers", action: "create_customer_profile" }),
    ).toEqual({ ok: false, reason: "TOOL_NOT_ALLOWLISTED" });
  });

  it("requires membership and workspace.view capability for child access", () => {
    expect(evaluateAiAgentRequest(child, { ...memberA, memberships: [] }, childRequest)).toEqual({ ok: false, reason: "CALLER_MEMBERSHIP_REQUIRED" });
    expect(evaluateAiAgentRequest(child, { ...memberA, memberships: [{ projectId: "company-a", active: true, capabilities: [] }] }, childRequest)).toEqual({ ok: false, reason: "CALLER_CAPABILITY_REQUIRED" });
    expect(evaluateAiAgentRequest(child, { ...memberA, memberships: [{ projectId: "company-a", active: false, capabilities: ["workspace.view"] }] }, childRequest)).toEqual({ ok: false, reason: "CALLER_MEMBERSHIP_REQUIRED" });
  });

  it("keeps Global AI ADMIN-only and requires explicit accessible target for detail tools", () => {
    expect(evaluateAiAgentRequest(global, admin, { workspaceKind: "GLOBAL", toolName: "get_workspace_overview", action: "get_workspace_overview" })).toEqual({ ok: true, scope: "GLOBAL" });
    expect(evaluateAiAgentRequest(global, admin, { workspaceKind: "GLOBAL", toolName: "read_customers", action: "read_customers" })).toEqual({ ok: false, reason: "GLOBAL_TARGET_REQUIRED" });
    expect(evaluateAiAgentRequest(global, admin, { workspaceKind: "GLOBAL", targetProjectId: "company-a", toolName: "read_customers", action: "read_customers" })).toEqual({ ok: true, scope: "GLOBAL", projectId: "company-a" });
    expect(evaluateAiAgentRequest(global, admin, { workspaceKind: "GLOBAL", targetProjectId: "company-z", toolName: "read_customers", action: "read_customers" })).toEqual({ ok: false, reason: "GLOBAL_TARGET_DENIED" });
    expect(evaluateAiAgentRequest(global, memberA, { workspaceKind: "GLOBAL", toolName: "get_workspace_overview", action: "get_workspace_overview" })).toEqual({ ok: false, reason: "GLOBAL_ADMIN_REQUIRED" });
    expect(evaluateAiAgentRequest(global, admin, { workspaceKind: "INTERNAL", toolName: "get_workspace_overview", action: "get_workspace_overview" })).toEqual({ ok: false, reason: "GLOBAL_ADMIN_REQUIRED" });
  });
});
