import { describe, expect, it } from "vitest";
import { resolveWorkspaceContext } from "./v2-workspace-context";

describe("workspace context resolver", () => {
  const base = { accessibleProjectIds: ["project-a", "project-b"] };

  it("never accepts a project target in Internal context", () => {
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "INTERNAL", action: "read_customers", requestedProjectId: "project-a" })).toEqual({ ok: false, reason: "WORKSPACE_SCOPE_DENIED" });
  });

  it("requires an explicit active project for Project context", () => {
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "PROJECT", action: "read_customers", activeProjectId: "project-a" })).toEqual({ ok: false, reason: "PROJECT_SCOPE_REQUIRED" });
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "PROJECT", action: "read_customers", activeProjectId: "project-a", requestedProjectId: "project-a" })).toEqual({ ok: true, workspaceKind: "PROJECT", projectId: "project-a" });
  });

  it("allows only aggregate without a target in Global and denies foreign target", () => {
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "GLOBAL", action: "get_workspace_overview" })).toEqual({ ok: true, workspaceKind: "GLOBAL" });
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "GLOBAL", action: "read_customers" })).toEqual({ ok: false, reason: "GLOBAL_PROJECT_REQUIRED" });
    expect(resolveWorkspaceContext({ ...base, workspaceKind: "GLOBAL", action: "read_customers", requestedProjectId: "project-z" })).toEqual({ ok: false, reason: "PROJECT_SCOPE_DENIED" });
  });
});
