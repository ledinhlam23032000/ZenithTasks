import type { AiWorkspaceContext } from "./ai-governance";

/**
 * The current assistant actions are clinic/Internal actions. Until project-local
 * adapters exist, a prompt must never be allowed to route them to legacy models.
 */
const PROJECT_LOCAL_AI_ACTIONS = new Set([
  "get_project_overview",
  "get_project_customers",
  "get_project_tasks",
  "get_project_sales_summary",
  "create_project_task",
  "get_project_payroll_preview",
]);

const GLOBAL_AGGREGATE_AI_ACTIONS = new Set([
  "get_workspace_overview",
  "get_ecosystem_kpi_summary",
  "get_system_health_and_ai_status",
]);

export function getAiWorkspaceActionError(workspace: AiWorkspaceContext, action: string): string | null {
  if (action === "none") return null;
  if (workspace.workspaceKind === "INTERNAL") {
    if (GLOBAL_AGGREGATE_AI_ACTIONS.has(action)) return `${action} chỉ được phép trong phạm vi GLOBAL.`;
    if (PROJECT_LOCAL_AI_ACTIONS.has(action)) return "Project-local tool chỉ được phép trong workspace PROJECT; không fallback về Nội Bộ.";
    return null;
  }
  if (workspace.workspaceKind === "GLOBAL" && GLOBAL_AGGREGATE_AI_ACTIONS.has(action)) return null;
  if (workspace.workspaceKind === "GLOBAL") return "Phạm vi GLOBAL hiện chỉ mở aggregate (get_workspace_overview, get_ecosystem_kpi_summary, get_system_health_and_ai_status); thao tác chi tiết cần adapter project-local và projectId cụ thể.";
  if (workspace.workspaceKind === "PROJECT" && PROJECT_LOCAL_AI_ACTIONS.has(action)) return null;
  return "Trợ lý AI trong Dự án hiện chưa có adapter project-local cho nghiệp vụ này; em dừng để không đọc hoặc ghi nhầm dữ liệu Nội Bộ.";
}


