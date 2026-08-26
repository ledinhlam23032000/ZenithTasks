import { V2_MODULES } from "./v2-modules";

export type WorkspaceNavigationOption = { id: string; enabledFeatures: string[]; name?: string };
export type WorkspaceNavigationItem = { href: string; label: string; icon: string; group: string };

const workspaceIcon: Record<string, string> = { organization: "Building2", mechanism: "Calculator", simulation: "Activity", tasks: "ListTodo" };

export function resolveActiveProjectWorkspace(pathname: string, queryProjectId: string | null | undefined, workspaces: WorkspaceNavigationOption[]) {
  const routeProjectId = pathname.match(/^\/du-an\/([^/]+)/)?.[1];
  const activeId = routeProjectId ?? (pathname === "/tro-ly" ? queryProjectId ?? undefined : undefined);
  if (!activeId || activeId === "__GLOBAL__") return undefined;
  return workspaces.find((workspace) => workspace.id === activeId);
}

export function buildProjectWorkspaceNav(workspace: WorkspaceNavigationOption | undefined, role: string): WorkspaceNavigationItem[] {
  if (!workspace) return [];
  return [
    { href: `/du-an/${workspace.id}`, label: "Tổng quan workspace", icon: "LayoutDashboard", group: "Workspace" },
    ...V2_MODULES.filter((module) => module.available && workspace.enabledFeatures.includes(module.key)).map((module) => ({ href: module.key === "simulation" ? `/du-an/${workspace.id}/co-che?tab=simulation` : module.href(workspace.id), label: module.label, icon: workspaceIcon[module.key] ?? "Boxes", group: "Workspace" })),
    { href: `/du-an/${workspace.id}/thanh-vien`, label: "Thành viên", icon: "Users", group: "Workspace" },
    { href: `/tro-ly?p=${encodeURIComponent(workspace.id)}`, label: "Trợ lý AI", icon: "Sparkles", group: "Workspace" },
    ...(role === "ADMIN" ? [{ href: "/du-an", label: "Quản lý Dự án", icon: "Boxes", group: "Quản trị chung" }] : []),
  ];
}
