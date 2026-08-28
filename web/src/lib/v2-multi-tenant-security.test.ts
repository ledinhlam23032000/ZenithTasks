import { describe, expect, it } from "vitest";
import { evaluateAiAgentRequest, type AiAgentDescriptor, type AiAgentCaller } from "./v2-ai-agent-policy";
import { evaluateAiToolRequest, type AiPrincipal } from "./ai-governance";
import { validateAiJobEnvelope, nextAiJobStatus, type AiJobEnvelope } from "./v2-ai-job-contract";
import { getProjectTemplate } from "./v2-project-templates";

describe("V2 Multi-Tenant Security & Isolation Invariants", () => {
  const childAgentA: AiAgentDescriptor = {
    kind: "CHILD",
    status: "ACTIVE",
    projectId: "project-alpha",
    toolAllowlist: ["get_project_overview", "get_project_tasks", "get_project_customers"],
  };

  const callerMemberA: AiAgentCaller = {
    role: "STAFF",
    memberships: [{ projectId: "project-alpha", active: true, capabilities: ["workspace.view"] }],
    accessibleProjectIds: ["project-alpha"],
  };

  const callerMemberB: AiAgentCaller = {
    role: "STAFF",
    memberships: [{ projectId: "project-beta", active: true, capabilities: ["workspace.view"] }],
    accessibleProjectIds: ["project-beta"],
  };

  it("strictly enforces tenant isolation: Member of Project B is DENIED from invoking Agent of Project A", () => {
    const result = evaluateAiAgentRequest(childAgentA, callerMemberB, {
      workspaceKind: "PROJECT",
      projectId: "project-alpha",
      toolName: "get_project_overview",
      action: "get_project_overview",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("CALLER_MEMBERSHIP_REQUIRED");
    }
  });

  it("allows authorized Member of Project A to invoke Child Agent of Project A", () => {
    const result = evaluateAiAgentRequest(childAgentA, callerMemberA, {
      workspaceKind: "PROJECT",
      projectId: "project-alpha",
      toolName: "get_project_overview",
      action: "get_project_overview",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scope).toBe("CHILD");
      expect(result.projectId).toBe("project-alpha");
    }
  });

  it("blocks tools not present in agent allowlist even if user has membership", () => {
    const result = evaluateAiAgentRequest(childAgentA, callerMemberA, {
      workspaceKind: "PROJECT",
      projectId: "project-alpha",
      toolName: "delete_database",
      action: "delete_database",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("TOOL_NOT_ALLOWLISTED");
    }
  });

  it("guarantees Global AI aggregate reads never leak raw clinic/tenant rows to unauthorized callers", () => {
    const globalPrincipal: AiPrincipal = {
      userId: "admin-1",
      role: "ADMIN",
      workspaceKind: "GLOBAL",
      projectIds: ["project-alpha", "project-beta"],
      capabilities: ["get_workspace_overview", "get_ecosystem_kpi_summary"],
    };

    const staffPrincipal: AiPrincipal = {
      userId: "staff-1",
      role: "STAFF",
      workspaceKind: "PROJECT",
      activeProjectId: "project-alpha",
      projectIds: ["project-alpha"],
      capabilities: ["get_project_overview"],
    };

    // Admin in GLOBAL scope can get ecosystem KPI
    const adminCheck = evaluateAiToolRequest(globalPrincipal, {
      toolName: "get_ecosystem_kpi_summary",
      action: "get_ecosystem_kpi_summary",
      resource: "projects",
    });
    expect(adminCheck.decision).toBe("ALLOW");

    // Staff in PROJECT scope attempting global ecosystem read is DENIED
    const staffCheck = evaluateAiToolRequest(staffPrincipal, {
      toolName: "get_ecosystem_kpi_summary",
      action: "get_ecosystem_kpi_summary",
      resource: "projects",
    });
    expect(staffCheck.decision).toBe("DENY");
  });

  it("verifies AI Job state machine monotonic progression and envelope validation", () => {
    const validEnvelope: AiJobEnvelope = {
      idempotencyKey: "GLOBAL_get_project_overview_1234567890",
      requestedByUserId: "admin-1",
      source: { workspaceKind: "GLOBAL" },
      target: { kind: "CHILD", agentId: "agent-1", projectId: "project-alpha" },
      toolName: "get_project_overview",
      action: "get_project_overview",
      arguments: { limit: 10 },
      dataAccess: "SCOPED_PROJECT_DATA",
      requiresRuntimeReauthorization: true,
      timeoutMs: 30_000,
      maxAttempts: 3,
    };

    expect(validateAiJobEnvelope(validEnvelope)).toEqual({ ok: true });

    // Status transitions
    expect(nextAiJobStatus("QUEUED", "START")).toBe("RUNNING");
    expect(nextAiJobStatus("RUNNING", "SUCCEED")).toBe("SUCCEEDED");
    expect(nextAiJobStatus("RUNNING", "FAIL")).toBe("FAILED");
    expect(nextAiJobStatus("QUEUED", "CANCEL")).toBe("CANCELLED");
  });

  it("verifies Project Template presets provide correct default capabilities and Lego modules", () => {
    const clinic = getProjectTemplate("CLINIC");
    expect(clinic.defaultModules).toContain("appointments");
    expect(clinic.defaultModules).toContain("customers");
    expect(clinic.suggestedAiName).toBeDefined();

    const sales = getProjectTemplate("SALES_TEAM");
    expect(sales.defaultProjectType).toBe("DISTRIBUTION");
    expect(sales.defaultModules).toContain("sales");
  });
});
