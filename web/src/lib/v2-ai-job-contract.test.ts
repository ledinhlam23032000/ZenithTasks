import { describe, expect, it } from "vitest";
import { nextAiJobStatus, validateAiJobEnvelope } from "./v2-ai-job-contract";

const childJob = {
  idempotencyKey: "qa-job-20260828-company-a-001",
  requestedByUserId: "qa-user-a",
  source: { workspaceKind: "PROJECT" as const, projectId: "company-a", conversationId: "conv-a", messageId: "msg-a" },
  target: { kind: "CHILD" as const, agentId: "agent-a", projectId: "company-a" },
  toolName: "project-read",
  action: "read_project_overview",
  arguments: { projectId: "company-a" },
  dataAccess: "SCOPED_PROJECT_DATA" as const,
  requiresRuntimeReauthorization: true as const,
  timeoutMs: 30_000,
  maxAttempts: 2,
};

describe("AI job contract", () => {
  it("requires a project source id and a child target in the same project", () => {
    expect(validateAiJobEnvelope(childJob)).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...childJob, source: { ...childJob.source, projectId: "company-b" } })).toEqual({ ok: false, reason: "PROJECT_TARGET_MUST_MATCH_SOURCE" });
    expect(validateAiJobEnvelope({ ...childJob, target: { kind: "CHILD", agentId: "agent-b", projectId: "company-b" } })).toEqual({ ok: false, reason: "PROJECT_TARGET_MUST_MATCH_SOURCE" });
    expect(validateAiJobEnvelope({ ...childJob, source: { workspaceKind: "PROJECT", projectId: "" } })).toEqual({ ok: false, reason: "PROJECT_SOURCE_SCOPE_REQUIRED" });
    expect(validateAiJobEnvelope({ ...childJob, target: { kind: "GLOBAL", agentId: "global", projectId: null } })).toEqual({ ok: false, reason: "PROJECT_SOURCE_REQUIRES_CHILD_TARGET" });
  });

  it("permits only an explicit global aggregate target for a global source by default", () => {
    const globalJob = { ...childJob, source: { workspaceKind: "GLOBAL" as const }, target: { kind: "GLOBAL" as const, agentId: "global", projectId: null }, dataAccess: "METADATA_ONLY" as const };
    expect(validateAiJobEnvelope(globalJob)).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...globalJob, target: { kind: "GLOBAL", agentId: "global", projectId: "company-a" } as unknown as typeof globalJob.target })).toEqual({ ok: false, reason: "GLOBAL_TARGET_MUST_BE_EXPLICIT_AGGREGATE" });
  });

  it("allows bounded Global-to-Child coordination only with explicit child/project target", () => {
    const coordinated = { ...childJob, source: { workspaceKind: "GLOBAL" as const }, target: { kind: "CHILD" as const, agentId: "agent-a", projectId: "company-a" }, dataAccess: "METADATA_ONLY" as const };
    expect(validateAiJobEnvelope(coordinated)).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...coordinated, target: { kind: "CHILD", agentId: "agent-a", projectId: "" } })).toEqual({ ok: false, reason: "GLOBAL_CHILD_TARGET_SCOPE_REQUIRED" });
  });

  it("requires approval before a raw tenant data access mode", () => {
    expect(validateAiJobEnvelope({ ...childJob, dataAccess: "APPROVED_RAW_TENANT_DATA" })).toEqual({ ok: false, reason: "RAW_DATA_APPROVAL_REQUIRED" });
    expect(validateAiJobEnvelope({ ...childJob, dataAccess: "APPROVED_RAW_TENANT_DATA", approvalId: "approval-1" })).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...childJob, requiresRuntimeReauthorization: false })).toEqual({ ok: false, reason: "RUNTIME_REAUTHORIZATION_REQUIRED" });
  });

  it("bounds timeout and retry policy instead of trusting prompt values", () => {
    expect(validateAiJobEnvelope({ ...childJob, timeoutMs: 0 })).toEqual({ ok: false, reason: "TIMEOUT_OUT_OF_BOUNDS" });
    expect(validateAiJobEnvelope({ ...childJob, timeoutMs: 120_001 })).toEqual({ ok: false, reason: "TIMEOUT_OUT_OF_BOUNDS" });
    expect(validateAiJobEnvelope({ ...childJob, maxAttempts: 4 })).toEqual({ ok: false, reason: "RETRY_OUT_OF_BOUNDS" });
  });

  it("keeps job status transitions monotonic and idempotent on duplicate events", () => {
    expect(nextAiJobStatus("QUEUED", "START")).toBe("RUNNING");
    expect(nextAiJobStatus("RUNNING", "SUCCEED")).toBe("SUCCEEDED");
    expect(nextAiJobStatus("SUCCEEDED", "SUCCEED")).toBe("SUCCEEDED");
    expect(nextAiJobStatus("RUNNING", "TIMEOUT")).toBe("TIMED_OUT");
    expect(nextAiJobStatus("TIMED_OUT", "START")).toBe("TIMED_OUT");
  });
});
