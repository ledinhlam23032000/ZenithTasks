import { describe, expect, it } from "vitest";
import { evaluateAiToolRequest, maskSensitiveRecord, type AiPrincipal } from "./ai-governance";

const principal: AiPrincipal = { userId: "owner-1", role: "ADMIN", agentProfile: "EXECUTIVE", projectIds: ["project-1"], capabilities: ["read.dashboard", "read.medical", "hr.terminate", "system.deploy"] };
const projectPrincipal: AiPrincipal = { ...principal, workspaceKind: "PROJECT", activeProjectId: "project-1" };
const globalPrincipal: AiPrincipal = {
  ...principal,
  workspaceKind: "GLOBAL",
  capabilities: [
    ...principal.capabilities,
    "get_workspace_overview",
    "get_ecosystem_kpi_summary",
    "get_system_health_and_ai_status",
  ],
};

describe("AI governance policy", () => {
  it("denies requests outside project scope", () => {
    expect(evaluateAiToolRequest(principal, { toolName: "read", action: "read.dashboard", resource: "sales", projectId: "other" }).decision).toBe("DENY");
  });
  it("allows the aggregate overview and ecosystem KPI only in GLOBAL scope", () => {
    expect(evaluateAiToolRequest(globalPrincipal, { toolName: "get_workspace_overview", action: "get_workspace_overview", resource: "projects" }).decision).toBe("ALLOW");
    expect(evaluateAiToolRequest(globalPrincipal, { toolName: "get_ecosystem_kpi_summary", action: "get_ecosystem_kpi_summary", resource: "projects" }).decision).toBe("ALLOW");
    expect(evaluateAiToolRequest(globalPrincipal, { toolName: "get_system_health_and_ai_status", action: "get_system_health_and_ai_status", resource: "ai" }).decision).toBe("ALLOW");
    expect(evaluateAiToolRequest(principal, { toolName: "get_workspace_overview", action: "get_workspace_overview", resource: "projects" }).reason).toBe("GLOBAL_SCOPE_REQUIRED");
    expect(evaluateAiToolRequest(principal, { toolName: "get_ecosystem_kpi_summary", action: "get_ecosystem_kpi_summary", resource: "projects" }).reason).toBe("GLOBAL_SCOPE_REQUIRED");
  });

  it("requires an explicit projectId for non-aggregate tools in GLOBAL scope", () => {
    const result = evaluateAiToolRequest(globalPrincipal, { toolName: "read", action: "read.dashboard", resource: "sales" });
    expect(result.decision).toBe("DENY");
    expect(result.reason).toBe("GLOBAL_PROJECT_REQUIRED");
  });
  it("allows Global Admin to target a project in its project list", () => {
    expect(evaluateAiToolRequest(globalPrincipal, { toolName: "read", action: "read.dashboard", resource: "sales", projectId: "project-1" }).decision).toBe("ALLOW");
  });
  it("requires projectId for non-none tools inside a project workspace", () => {
    const result = evaluateAiToolRequest(projectPrincipal, { toolName: "read", action: "read.dashboard", resource: "sales" });
    expect(result.decision).toBe("DENY");
    expect(result.reason).toBe("PROJECT_SCOPE_REQUIRED");
  });
  it("denies a tool targeting a different project from the active workspace", () => {
    const result = evaluateAiToolRequest(projectPrincipal, { toolName: "read", action: "read.dashboard", resource: "sales", projectId: "other" });
    expect(result.decision).toBe("DENY");
    expect(result.reason).toBe("PROJECT_SCOPE_DENIED");
  });
  it("denies a request explicitly marked as another workspace kind", () => {
    const result = evaluateAiToolRequest(projectPrincipal, { toolName: "read", action: "read.dashboard", resource: "sales", projectId: "project-1", workspaceKind: "INTERNAL" });
    expect(result.decision).toBe("DENY");
    expect(result.reason).toBe("WORKSPACE_SCOPE_DENIED");
  });
  it("requires purpose and confirmation for medical data", () => {
    const result = evaluateAiToolRequest(principal, { toolName: "case_read", action: "read.medical", resource: "case", projectId: "project-1", includesMedicalData: true });
    expect(result.decision).toBe("REQUIRE_CONFIRMATION");
    expect(result.purposeRequired).toBe(true);
    expect(result.allowedFields).toContain("diagnosis");
  });
  it("does not turn termination into a one-step destructive action", () => {
    const result = evaluateAiToolRequest(principal, { toolName: "hr_terminate", action: "hr.terminate", resource: "employee", projectId: "project-1", irreversible: true });
    expect(result.decision).toBe("REQUIRE_APPROVAL");
    expect(result.requiredApprovals).toBe(2);
    expect(result.rollback).toBe("WORKFLOW_ONLY");
  });
  it("requires two approvals for production changes", () => {
    const result = evaluateAiToolRequest(principal, { toolName: "system", action: "system.deploy", resource: "production", projectId: "project-1", requiresProductionChange: true });
    expect(result.requiredApprovals).toBe(2);
    expect(result.confirmationRequired).toBe(true);
  });
  it("keeps AI config proposals project-targeted and draft-only", () => {
    const proposer = { ...globalPrincipal, capabilities: [...globalPrincipal.capabilities, "propose_workspace_config"] };
    const draft = evaluateAiToolRequest(proposer, { toolName: "propose_workspace_config", action: "propose_workspace_config", resource: "workspace_config", projectId: "project-1" });
    expect(draft.decision).toBe("WARN");
    expect(draft.reason).toBe("DRAFT_ONLY");
    expect(evaluateAiToolRequest(proposer, { toolName: "propose_workspace_config", action: "propose_workspace_config", resource: "workspace_config" }).reason).toBe("GLOBAL_PROJECT_REQUIRED");
    expect(evaluateAiToolRequest({ ...proposer, role: "MANAGER", capabilities: [] }, { toolName: "propose_workspace_config", action: "propose_workspace_config", resource: "workspace_config", projectId: "project-1" }).reason).toBe("CAPABILITY_DENIED");
  });
  it("masks fields not allowed by policy", () => {
    expect(maskSensitiveRecord({ diagnosis: "x", phone: "y" }, ["diagnosis"])).toEqual({ diagnosis: "x", phone: "[ĐÃ ẨN THEO POLICY]" });
  });
});
