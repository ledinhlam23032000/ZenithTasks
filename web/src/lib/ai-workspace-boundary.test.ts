import { describe, expect, it } from "vitest";
import { getAiWorkspaceActionError } from "./ai-workspace-boundary";

describe("AI workspace action boundary", () => {
  it("keeps Internal legacy actions available but rejects the Global aggregate there", () => {
    expect(getAiWorkspaceActionError({ workspaceKind: "INTERNAL" }, "get_customer_profile")).toBeNull();
    expect(getAiWorkspaceActionError({ workspaceKind: "INTERNAL" }, "get_workspace_overview")).toContain("GLOBAL");
  });

  it("allows only the aggregate tool in Global", () => {
    expect(getAiWorkspaceActionError({ workspaceKind: "GLOBAL" }, "get_workspace_overview")).toBeNull();
    expect(getAiWorkspaceActionError({ workspaceKind: "GLOBAL" }, "get_customer_profile")).toContain("adapter project-local");
    expect(getAiWorkspaceActionError({ workspaceKind: "GLOBAL" }, "record_payment")).toContain("adapter project-local");
  });

  it("rejects legacy reads and writes in Project instead of falling back to Internal", () => {
    const workspace = { workspaceKind: "PROJECT" as const, projectId: "project-a" };
    expect(getAiWorkspaceActionError(workspace, "get_debt_summary")).toContain("chưa có adapter project-local");
    expect(getAiWorkspaceActionError(workspace, "create_appointment")).toContain("chưa có adapter project-local");
    expect(getAiWorkspaceActionError(workspace, "get_project_customers")).toBeNull();
    expect(getAiWorkspaceActionError({ workspaceKind: "INTERNAL" }, "get_project_customers")).toContain("không fallback về Nội Bộ");
    expect(getAiWorkspaceActionError({ workspaceKind: "GLOBAL" }, "get_project_customers")).toContain("aggregate");
  });
});
