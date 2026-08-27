export type WorkspaceKind = "INTERNAL" | "PROJECT" | "GLOBAL";

export type WorkspaceContextResolution =
  | { ok: true; workspaceKind: WorkspaceKind; projectId?: string }
  | { ok: false; reason: "WORKSPACE_SCOPE_DENIED" | "PROJECT_SCOPE_REQUIRED" | "GLOBAL_PROJECT_REQUIRED" | "PROJECT_SCOPE_DENIED" };

export function resolveWorkspaceContext(input: {
  workspaceKind?: WorkspaceKind;
  requestWorkspaceKind?: WorkspaceKind;
  action: string;
  requestedProjectId?: string;
  activeProjectId?: string;
  accessibleProjectIds: readonly string[];
}): WorkspaceContextResolution {
  if (!input.workspaceKind) {
    if (input.requestWorkspaceKind && input.requestWorkspaceKind !== "INTERNAL") return { ok: false, reason: "WORKSPACE_SCOPE_DENIED" };
    if (input.requestedProjectId && !input.accessibleProjectIds.includes(input.requestedProjectId)) return { ok: false, reason: "PROJECT_SCOPE_DENIED" };
    return { ok: true, workspaceKind: "INTERNAL", ...(input.requestedProjectId ? { projectId: input.requestedProjectId } : {}) };
  }
  if (input.requestWorkspaceKind && input.requestWorkspaceKind !== input.workspaceKind) return { ok: false, reason: "WORKSPACE_SCOPE_DENIED" };
  if (input.workspaceKind === "INTERNAL") {
    return input.requestedProjectId ? { ok: false, reason: "WORKSPACE_SCOPE_DENIED" } : { ok: true, workspaceKind: "INTERNAL" };
  }
  if (input.workspaceKind === "PROJECT" && input.activeProjectId && !input.requestedProjectId) return { ok: false, reason: "PROJECT_SCOPE_REQUIRED" };
  if (input.workspaceKind === "GLOBAL" && input.action !== "get_workspace_overview" && !input.requestedProjectId) return { ok: false, reason: "GLOBAL_PROJECT_REQUIRED" };
  if (input.requestedProjectId && (!input.accessibleProjectIds.includes(input.requestedProjectId) || (input.activeProjectId && input.requestedProjectId !== input.activeProjectId))) return { ok: false, reason: "PROJECT_SCOPE_DENIED" };
  return { ok: true, workspaceKind: input.workspaceKind, ...(input.requestedProjectId ? { projectId: input.requestedProjectId } : {}) };
}
