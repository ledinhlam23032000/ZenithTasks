import { describe, expect, it } from "vitest";
import { evaluateAiToolRequest, maskSensitiveRecord, type AiPrincipal } from "./ai-governance";

const principal: AiPrincipal = { userId: "owner-1", role: "ADMIN", agentProfile: "EXECUTIVE", projectIds: ["project-1"], capabilities: ["read.dashboard", "read.medical", "hr.terminate", "system.deploy"] };

describe("AI governance policy", () => {
  it("denies requests outside project scope", () => {
    expect(evaluateAiToolRequest(principal, { toolName: "read", action: "read.dashboard", resource: "sales", projectId: "other" }).decision).toBe("DENY");
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
  it("masks fields not allowed by policy", () => {
    expect(maskSensitiveRecord({ diagnosis: "x", phone: "y" }, ["diagnosis"])).toEqual({ diagnosis: "x", phone: "[ĐÃ ẨN THEO POLICY]" });
  });
});
