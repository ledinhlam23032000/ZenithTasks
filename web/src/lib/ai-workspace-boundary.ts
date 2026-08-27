import type { AiWorkspaceContext } from "./ai-governance";

/**
 * The current assistant actions are clinic/Internal actions. Until project-local
 * adapters exist, a prompt must never be allowed to route them to legacy models.
 */
export function getAiWorkspaceActionError(workspace: AiWorkspaceContext, action: string): string | null {
  if (action === "none") return null;
  if (workspace.workspaceKind === "INTERNAL") {
    if (action === "get_workspace_overview") return "get_workspace_overview chỉ được phép trong phạm vi GLOBAL.";
    return null;
  }
  if (workspace.workspaceKind === "GLOBAL" && action === "get_workspace_overview") return null;
  if (workspace.workspaceKind === "GLOBAL") return "Phạm vi GLOBAL hiện chỉ mở aggregate get_workspace_overview; thao tác chi tiết cần adapter project-local và projectId cụ thể.";
  return "Trợ lý AI trong Dự án hiện chưa có adapter project-local cho nghiệp vụ này; em dừng để không đọc hoặc ghi nhầm dữ liệu Nội Bộ.";
}
