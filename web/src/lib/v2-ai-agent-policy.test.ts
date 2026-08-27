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
  });

  it("requires ACTIVE status and an allowlisted tool", () => {
    expect(evaluateAiAgentRequest({ ...child, status: "DRAFT" }, memberA, childRequest)).toEqual({ ok: false, reason: "AGENT_NOT_ACTIVE" });
    expect(evaluateAiAgentRequest(child, memberA, { ...childRequest, toolName: "get_payroll" })).toEqual({ ok: false, reason: "TOOL_NOT_ALLOWLISTED" });
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
