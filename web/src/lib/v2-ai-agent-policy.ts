export type AiAgentKind = "CHILD" | "GLOBAL";
export type AiAgentStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type AiAgentWorkspace = "INTERNAL" | "PROJECT" | "GLOBAL";

export type AiAgentDescriptor = {
  kind: AiAgentKind;
  status: AiAgentStatus;
  projectId: string | null;
  toolAllowlist: readonly string[];
};

export type AiAgentCaller = {
  role: string;
  memberships: readonly { projectId: string; active: boolean; capabilities: readonly string[] }[];
  accessibleProjectIds: readonly string[];
};

export type AiAgentRequest = {
  workspaceKind: AiAgentWorkspace;
  projectId?: string;
  targetProjectId?: string;
  toolName: string;
  action: string;
};

export type AiAgentPolicyResult =
  | { ok: true; scope: "CHILD" | "GLOBAL"; projectId?: string }
  | { ok: false; reason: "AGENT_NOT_ACTIVE" | "AGENT_KIND_SCOPE_MISMATCH" | "AGENT_PROJECT_MISMATCH" | "CALLER_MEMBERSHIP_REQUIRED" | "CALLER_CAPABILITY_REQUIRED" | "GLOBAL_ADMIN_REQUIRED" | "GLOBAL_TARGET_REQUIRED" | "GLOBAL_TARGET_DENIED" | "TOOL_NOT_ALLOWLISTED" };

export function evaluateAiAgentRequest(agent: AiAgentDescriptor, caller: AiAgentCaller, request: AiAgentRequest): AiAgentPolicyResult {
  if (agent.status !== "ACTIVE") return { ok: false, reason: "AGENT_NOT_ACTIVE" };
  // Allowlist phải chặn đúng THỨ ĐƯỢC THỰC THI, và thứ được thực thi là `action`
  // (xem dispatchJobTool — nay chỉ định tuyến theo action, không còn theo toolName).
  //
  // Gate trước đây chỉ kiểm `toolName` nên là lỗ leo thang quyền: agent có allowlist
  // ["get_project_tasks"] chỉ cần gửi toolName="get_project_tasks" kèm
  // action="create_customer_profile" là qua cửa rồi GHI dữ liệu chưa hề được cấp.
  //
  // `toolName` nay chỉ là nhãn mô tả (vd "task-list"), KHÔNG quyết định hành vi và
  // KHÔNG được dùng làm căn cứ phân quyền — giữ đúng một nguồn thẩm quyền duy nhất.
  if (!agent.toolAllowlist.includes(request.action)) return { ok: false, reason: "TOOL_NOT_ALLOWLISTED" };

  if (agent.kind === "CHILD") {
    if (request.workspaceKind !== "PROJECT") return { ok: false, reason: "AGENT_KIND_SCOPE_MISMATCH" };
    if (!agent.projectId || request.projectId !== agent.projectId) return { ok: false, reason: "AGENT_PROJECT_MISMATCH" };
    const membership = caller.memberships.find((item) => item.projectId === agent.projectId && item.active);
    const globalAdminAccess = caller.role === "ADMIN" && caller.accessibleProjectIds.includes(agent.projectId);
    if (!membership && !globalAdminAccess) return { ok: false, reason: "CALLER_MEMBERSHIP_REQUIRED" };
    if (membership && !membership.capabilities.includes("workspace.view")) return { ok: false, reason: "CALLER_CAPABILITY_REQUIRED" };
    return { ok: true, scope: "CHILD", projectId: agent.projectId };
  }

  if (caller.role !== "ADMIN" || request.workspaceKind !== "GLOBAL") return { ok: false, reason: "GLOBAL_ADMIN_REQUIRED" };
  // get_child_agent_status đọc TOÀN BỘ agent con (không thuộc 1 project cụ thể)
  // nên là aggregate giống 3 action kia — không cần targetProjectId explicit.
  // suspend_child_agent KHÔNG nằm trong danh sách này: nó tác động một agent cụ
  // thể thuộc một project cụ thể nên PHẢI đi qua targetProjectId + accessibleProjectIds
  // như mọi GLOBAL→CHILD action khác (đúng nguyên tắc "explicit target").
  const globalAggregateActions = ["get_workspace_overview", "get_ecosystem_kpi_summary", "get_system_health_and_ai_status", "get_child_agent_status", "get_ecosystem_debt_alert"];
  if (globalAggregateActions.includes(request.action)) return { ok: true, scope: "GLOBAL" };
  const targetProjectId = request.targetProjectId ?? request.projectId;
  if (!targetProjectId) return { ok: false, reason: "GLOBAL_TARGET_REQUIRED" };
  if (!caller.accessibleProjectIds.includes(targetProjectId)) return { ok: false, reason: "GLOBAL_TARGET_DENIED" };
  return { ok: true, scope: "GLOBAL", projectId: targetProjectId };
}
