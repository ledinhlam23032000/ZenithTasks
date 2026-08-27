import { V2_MODULES, type V2ModuleKey } from "./v2-modules";

export type WorkspaceNavigationOption = { id: string; enabledFeatures: string[]; layoutOrder?: string[]; name?: string };
export type WorkspaceNavigationItem = { href: string; label: string; icon: string; group: string };

export function normalizeWorkspaceLayoutOrder(raw: unknown, enabledFeatures: readonly string[]): V2ModuleKey[] {
  if (!Array.isArray(raw)) return [];
  const enabled = new Set<string>(V2_MODULES.filter((module) => module.available && enabledFeatures.includes(module.key)).map((module) => module.key));
  const seen = new Set<string>();
  return raw.map(String).filter((key): key is V2ModuleKey => {
    if (!enabled.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isCompleteWorkspaceLayout(raw: unknown, enabledFeatures: readonly string[]): raw is V2ModuleKey[] {
  const expected = V2_MODULES.filter((module) => module.available && enabledFeatures.includes(module.key)).map((module) => module.key);
  const normalized = normalizeWorkspaceLayoutOrder(raw, enabledFeatures);
  return Array.isArray(raw) && raw.length === expected.length && normalized.length === expected.length;
}

const workspaceIcon: Record<string, string> = { organization: "Building2", mechanism: "Calculator", simulation: "Activity", tasks: "ListTodo" };

export function resolveActiveProjectWorkspace(pathname: string, queryProjectId: string | null | undefined, workspaces: WorkspaceNavigationOption[]) {
  const routeProjectId = pathname.match(/^\/du-an\/([^/]+)/)?.[1];
  const activeId = routeProjectId ?? (pathname === "/tro-ly" ? queryProjectId ?? undefined : undefined);
  if (!activeId || activeId === "__GLOBAL__") return undefined;
  return workspaces.find((workspace) => workspace.id === activeId);
}

export function buildProjectWorkspaceNav(workspace: WorkspaceNavigationOption | undefined, role: string): WorkspaceNavigationItem[] {
  if (!workspace) return [];
  const enabledModules = V2_MODULES.filter((module) => module.available && workspace.enabledFeatures.includes(module.key));
  const layoutRank = new Map(normalizeWorkspaceLayoutOrder(workspace.layoutOrder, workspace.enabledFeatures).map((key, index) => [key, index]));
  const orderedModules = [...enabledModules].sort((left, right) => {
    const leftRank = layoutRank.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = layoutRank.get(right.key) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });
  return [
    { href: `/du-an/${workspace.id}`, label: "Tổng quan workspace", icon: "LayoutDashboard", group: "Workspace" },
    ...orderedModules.map((module) => ({ href: module.key === "simulation" ? `/du-an/${workspace.id}/co-che?tab=simulation` : module.href(workspace.id), label: module.label, icon: workspaceIcon[module.key] ?? "Boxes", group: "Workspace" })),
    { href: `/du-an/${workspace.id}/thanh-vien`, label: "Thành viên", icon: "Users", group: "Workspace" },
    { href: `/tro-ly?p=${encodeURIComponent(workspace.id)}`, label: "Trợ lý AI", icon: "Sparkles", group: "Workspace" },
    ...(role === "ADMIN" ? [{ href: "/du-an", label: "Quản lý Dự án", icon: "Boxes", group: "Quản trị chung" }] : []),
  ];
}
