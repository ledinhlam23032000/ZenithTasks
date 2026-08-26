import { describe, expect, it } from "vitest";
import { buildProjectWorkspaceNav, resolveActiveProjectWorkspace } from "./v2-workspace-navigation";

describe("workspace navigation boundary", () => {
  const workspaces = [{ id: "project-a", enabledFeatures: ["customers", "sales", "tasks"] }];

  it("keeps Internal routes out of project navigation", () => {
    const nav = buildProjectWorkspaceNav(workspaces[0], "ADMIN");
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).toContain("/du-an/project-a/khach-hang");
    expect(hrefs).toContain("/du-an/project-a/doanh-so");
    expect(hrefs).toContain("/tro-ly?p=project-a");
    expect(hrefs).not.toContain("/khach-hang");
    expect(hrefs).not.toContain("/lich-hen");
    expect(hrefs).not.toContain("/luong");
    expect(hrefs).not.toContain("/thu-chi");
  });

  it("does not let GLOBAL sentinel become an active project", () => {
    expect(resolveActiveProjectWorkspace("/tro-ly", "__GLOBAL__", workspaces)).toBeUndefined();
    expect(resolveActiveProjectWorkspace("/du-an/__GLOBAL__", null, workspaces)).toBeUndefined();
    expect(resolveActiveProjectWorkspace("/tro-ly", "project-a", workspaces)?.id).toBe("project-a");
  });

  it("hides global project-management link from Manager navigation", () => {
    expect(buildProjectWorkspaceNav(workspaces[0], "MANAGER").some((item) => item.href === "/du-an")).toBe(false);
    expect(buildProjectWorkspaceNav(workspaces[0], "ADMIN").some((item) => item.href === "/du-an")).toBe(true);
  });
});
