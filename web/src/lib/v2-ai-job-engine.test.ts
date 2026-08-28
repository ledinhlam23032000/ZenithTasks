import { describe, expect, it, vi } from "vitest";
import { dispatchJobTool } from "./v2-ai-job-engine";
import { prisma } from "./db";

vi.mock("./db", () => ({
  prisma: {
    zProject: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([
        { id: "proj-1", code: "PROJ-1", name: "Dự án A", projectType: "SERVICE", status: "ACTIVE" },
      ]),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === "proj-1") {
          return Promise.resolve({
            id: "proj-1",
            code: "PROJ-1",
            name: "Dự án A",
            status: "ACTIVE",
            _count: { workspaceTasks: 5, workspaceCustomers: 12, workspaceAppointments: 4, workspaceSales: 8, members: 3 },
          });
        }
        return Promise.resolve(null);
      }),
    },
    zWorkspaceTask: {
      count: vi.fn().mockResolvedValue(15),
      findMany: vi.fn().mockResolvedValue([
        { id: "task-1", title: "Khảo sát mặt bằng", status: "TODO", priority: "NORMAL", dueAt: null, order: 1 },
      ]),
    },
    zWorkspaceCustomer: {
      findMany: vi.fn().mockResolvedValue([
        { id: "cust-1", code: "KH-001", fullName: "Nguyễn Văn A", phoneLast4: "5678", source: "FACEBOOK", consentStatus: "CONSENTED" },
      ]),
    },
    zAiAgent: {
      count: vi.fn().mockResolvedValue(4),
    },
  },
}));

describe("v2-ai-job-engine dispatchJobTool", () => {
  it("allows Admin to dispatch global overview tool", async () => {
    const result = await dispatchJobTool(
      "global-overview",
      "get_workspace_overview",
      null,
      {},
      { id: "user-admin", role: "ADMIN" }
    );
    expect(result.overview).toBeDefined();
    expect((result.overview as { totalProjects: number }).totalProjects).toBe(3);
    expect((result.overview as { activeProjectsCount: number }).activeProjectsCount).toBe(1);
  });

  it("denies non-Admin users from dispatching global overview tool", async () => {
    await expect(
      dispatchJobTool("global-overview", "get_workspace_overview", null, {}, { id: "user-viewer", role: "VIEWER" })
    ).rejects.toThrow("FORBIDDEN_GLOBAL_OVERVIEW");
  });

  it("dispatches project overview for a target project", async () => {
    const result = await dispatchJobTool(
      "project-read",
      "get_project_overview",
      "proj-1",
      {},
      { id: "user-mgr", role: "MANAGER" }
    );
    expect(result.projectOverview).toBeDefined();
    expect((result.projectOverview as { code: string }).code).toBe("PROJ-1");
  });

  it("dispatches task list and customer list with project isolation", async () => {
    const tasksRes = await dispatchJobTool(
      "task-list",
      "get_project_tasks",
      "proj-1",
      {},
      { id: "user-mgr", role: "MANAGER" }
    );
    expect(tasksRes.tasks).toBeDefined();
    expect(tasksRes.total).toBe(1);

    const customersRes = await dispatchJobTool(
      "customer-list",
      "get_project_customers",
      "proj-1",
      {},
      { id: "user-mgr", role: "MANAGER" }
    );
    expect(customersRes.customers).toBeDefined();
    expect(customersRes.total).toBe(1);
  });

  it("rejects unknown tool/action with UNSUPPORTED_JOB_TOOL_ACTION instead of fake success", async () => {
    await expect(
      dispatchJobTool(
        "nonexistent-tool",
        "nonexistent_action",
        "proj-1",
        {},
        { id: "user-admin", role: "ADMIN" }
      )
    ).rejects.toThrow("UNSUPPORTED_JOB_TOOL_ACTION");
  });
});
