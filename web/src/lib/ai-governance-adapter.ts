import type { AiPrincipal, AiPolicyResult, AiToolRequest } from "./ai-governance";
import { evaluateAiToolRequest, type AiWorkspaceContext } from "./ai-governance";

export const AI_READ_ACTIONS = new Set([
  "get_business_summary",
  "get_workspace_overview",
  "get_payroll_row",
  "get_customer_profile",
  "get_debt_summary",
  "get_lead_priorities",
  "get_financial_alerts",
  "prepare_payroll_export",
]);

const ADMIN_ACTIONS = [
  "none",
  "get_business_summary",
  "get_workspace_overview",
  "get_payroll_row",
  "get_customer_profile",
  "get_debt_summary",
  "get_lead_priorities",
  "get_financial_alerts",
  "prepare_payroll_export",
  "bulk_upsert_attendance",
  "save_payroll",
  "save_bulk_payroll",
  "record_payment",
  "create_follow_up",
  "create_appointment",
  "update_customer_profile",
  "delete_customer",
  "update_consultation_record",
  "create_payment_request",
  "approve_payment_request",
  "reject_payment_request",
  "pay_payment_request",
  "propose_system_change",
  "create_work_plan",
] as const;

export type AiDispatcherAction = (typeof ADMIN_ACTIONS)[number];

export function capabilitiesForRole(role: string): string[] {
  if (role === "ADMIN") return [...ADMIN_ACTIONS];
  if (role === "MANAGER") return [
    "get_business_summary",
    "get_debt_summary",
    "get_lead_priorities",
    "get_financial_alerts",
    "prepare_payroll_export",
    "bulk_upsert_attendance",
    "create_follow_up",
    "create_appointment",
  ];
  return ["get_business_summary", "get_debt_summary", "get_lead_priorities", "get_financial_alerts"];
}

export function principalForUser(user: { id: string; role: string }, projectIds: string[] = [], workspace: AiWorkspaceContext = { workspaceKind: "INTERNAL" }): AiPrincipal {
  return {
    userId: user.id,
    role: user.role,
    agentProfile: user.role === "ADMIN" ? "EXECUTIVE" : user.role === "MANAGER" ? "OPERATOR" : "VIEWER",
    projectIds,
    workspaceKind: workspace.workspaceKind,
    activeProjectId: workspace.projectId,
    capabilities: capabilitiesForRole(user.role),
  };
}

function numberArg(args: unknown, key: string): number | undefined {
  if (!args || typeof args !== "object") return undefined;
  const value = (args as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanArg(args: unknown, key: string): boolean {
  if (!args || typeof args !== "object") return false;
  return (args as Record<string, unknown>)[key] === true;
}

function projectIdArg(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const value = (args as Record<string, unknown>).projectId;
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function requestForAction(action: AiDispatcherAction | string, args: unknown): AiToolRequest {
  const includesMedicalData = action === "get_customer_profile" || action === "update_customer_profile" || action === "update_consultation_record";
  const includesPayrollData = action === "get_payroll_row" || action === "prepare_payroll_export" || action === "save_payroll" || action === "save_bulk_payroll";
  const destructive = action === "delete_customer";
  const amount = numberArg(args, "amount") ?? numberArg(args, "bonus") ?? numberArg(args, "adjustment");
  return {
    toolName: action,
    action,
    resource: action,
    projectId: projectIdArg(args),
    recordCount: Array.isArray((args as Record<string, unknown> | null)?.rows) ? ((args as Record<string, unknown>).rows as unknown[]).length : undefined,
    amount,
    includesMedicalData,
    includesPayrollData,
    irreversible: destructive || booleanArg(args, "irreversible"),
    requiresProductionChange: action === "deploy_production" || action === "upgrade_system",
    purpose: typeof (args as Record<string, unknown> | null)?.purpose === "string" ? String((args as Record<string, unknown>).purpose) : undefined,
  };
}

export function evaluateDispatcherAction(principal: AiPrincipal, action: AiDispatcherAction | string, args: unknown): AiPolicyResult {
  return evaluateAiToolRequest(principal, requestForAction(action, args));
}

export function governanceMessage(policy: AiPolicyResult): string {
  if (policy.decision === "DENY") return `Em dừng lại theo policy: ${policy.reason}. ${policy.consequences.join(" ")}`;
  const warning = policy.warningTitle ? `Cảnh báo: ${policy.warningTitle}. ` : "";
  const consequences = policy.consequences.length ? ` Hậu quả/phạm vi: ${policy.consequences.join(" ")}` : "";
  const approval = policy.requiredApprovals > 1 ? ` Cần workflow với ${policy.requiredApprovals} người phê duyệt; một lần xác nhận của ADMIN chưa đủ.` : "";
  const purpose = policy.purposeRequired ? " Cần nêu rõ mục đích và phạm vi tối thiểu." : "";
  return `${warning}${policy.reason}.${consequences}${approval}${purpose}`.trim();
}
