import { describe, expect, it } from "vitest";
import { canConfirmPreview, confirmationMessage, createApprovalPreview } from "./ai-approval-gate";
import { evaluateAiToolRequest, type AiPrincipal } from "./ai-governance";

const principal: AiPrincipal = { userId: "owner", role: "ADMIN", agentProfile: "EXECUTIVE", projectIds: ["p1"], capabilities: ["hr.terminate"] };

describe("AI approval gate", () => {
  it("creates an explicit preview for a sensitive employee workflow", () => {
    const policy = evaluateAiToolRequest(principal, { toolName: "hr", action: "hr.terminate", resource: "employee", projectId: "p1", recordCount: 1, purpose: "Đã có quyết định nhân sự" });
    const preview = createApprovalPreview(policy, { toolName: "hr", action: "hr.terminate", resource: "employee", projectId: "p1", recordCount: 1, purpose: "Đã có quyết định nhân sự" });
    expect(preview.status).toBe("PENDING");
    expect(preview.requiredApprovals).toBe(2);
    expect(canConfirmPreview(preview)).toBe(true);
    expect(confirmationMessage(preview)).toContain("Mức rủi ro L5");
  });
  it("rejects expired and already processed previews", () => {
    expect(canConfirmPreview({ decision: "REQUIRE_CONFIRMATION", status: "PENDING", expiresAt: "2020-01-01T00:00:00.000Z" })).toBe(false);
    expect(canConfirmPreview({ decision: "REQUIRE_CONFIRMATION", status: "CONFIRMED", expiresAt: "2099-01-01T00:00:00.000Z" })).toBe(false);
  });
});
