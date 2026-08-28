import { describe, expect, it } from "vitest";
import { nextAiJobStatus, validateAiJobEnvelope } from "./v2-ai-job-contract";

const childJob = {
  idempotencyKey: "qa-job-20260828-company-a-001",
  requestedByUserId: "qa-user-a",
  source: { workspaceKind: "PROJECT" as const, conversationId: "conv-a", messageId: "msg-a" },
  target: { kind: "CHILD" as const, agentId: "agent-a", projectId: "company-a" },
  toolName: "project-read",
  action: "read_project_overview",
  arguments: { projectId: "company-a" },
  timeoutMs: 30_000,
  maxAttempts: 2,
};

describe("AI job contract", () => {
  it("requires an explicit child target for a project source", () => {
    expect(validateAiJobEnvelope(childJob)).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...childJob, target: { kind: "GLOBAL", agentId: "global", projectId: null } })).toEqual({ ok: false, reason: "PROJECT_SOURCE_REQUIRES_CHILD_TARGET" });
  });

  it("requires an explicit global target for a global source and forbids project leakage", () => {
    const globalJob = { ...childJob, source: { workspaceKind: "GLOBAL" as const }, target: { kind: "GLOBAL" as const, agentId: "global", projectId: null } };
    expect(validateAiJobEnvelope(globalJob)).toEqual({ ok: true });
    expect(validateAiJobEnvelope({ ...globalJob, target: { kind: "CHILD", agentId: "agent-a", projectId: "company-a" } })).toEqual({ ok: false, reason: "GLOBAL_SOURCE_REQUIRES_GLOBAL_TARGET" });
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
