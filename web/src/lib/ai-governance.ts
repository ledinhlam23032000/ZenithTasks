export type AiRiskLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
export type AiDecision = "ALLOW" | "WARN" | "REQUIRE_CONFIRMATION" | "REQUIRE_APPROVAL" | "DENY";

export type AiWorkspaceContext = {
  workspaceKind: "INTERNAL" | "PROJECT";
  projectId?: string;
  label?: string;
};

export type AiToolRequest = {
  toolName: string;
  action: string;
  resource: string;
  projectId?: string;
  workspaceKind?: AiWorkspaceContext["workspaceKind"];
  recordCount?: number;
  amount?: number;
  includesMedicalData?: boolean;
  includesPayrollData?: boolean;
  irreversible?: boolean;
  requiresProductionChange?: boolean;
  purpose?: string;
};

export type AiPrincipal = {
  userId: string;
  role: string;
  agentProfile: "EXECUTIVE" | "OPERATOR" | "ANALYST" | "TRAINER" | "VIEWER";
  projectIds: string[];
  workspaceKind?: AiWorkspaceContext["workspaceKind"];
  activeProjectId?: string;
  capabilities: string[];
};

export type AiPolicyResult = {
  decision: AiDecision;
  riskLevel: AiRiskLevel;
  warningTitle?: string;
  consequences: string[];
  requiredApprovals: number;
  confirmationRequired: boolean;
  purposeRequired: boolean;
  allowedFields?: string[];
  rollback: "SUPPORTED" | "WORKFLOW_ONLY" | "NOT_AVAILABLE";
  reason: string;
};

const medicalFields = ["caseCode", "diagnosis", "consultation", "clinicalNotes", "photos", "prescription", "patientName"];

export function evaluateAiToolRequest(principal: AiPrincipal, request: AiToolRequest): AiPolicyResult {
  const currentWorkspace = principal.workspaceKind ?? "INTERNAL";
  if (request.workspaceKind && request.workspaceKind !== currentWorkspace) return { decision: "DENY", riskLevel: "L5", consequences: ["Yêu cầu khác workspace đang được chọn."], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "NOT_AVAILABLE", reason: "WORKSPACE_SCOPE_DENIED" };
  if (currentWorkspace === "PROJECT" && principal.activeProjectId && request.action !== "none" && !request.projectId) return { decision: "DENY", riskLevel: "L5", consequences: ["Tool chưa khai báo projectId nên AI không được đọc/ghi dữ liệu trong Dự án này."], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "NOT_AVAILABLE", reason: "PROJECT_SCOPE_REQUIRED" };
  const inScope = !request.projectId || principal.projectIds.includes(request.projectId);
  if (!inScope || (principal.activeProjectId && request.projectId !== principal.activeProjectId)) return { decision: "DENY", riskLevel: "L5", consequences: ["Yêu cầu nằm ngoài phạm vi Dự án đang được chọn."], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "NOT_AVAILABLE", reason: "PROJECT_SCOPE_DENIED" };
  if (!principal.capabilities.includes(request.action)) return { decision: "DENY", riskLevel: "L5", consequences: ["AI profile hiện tại chưa được cấp capability cho thao tác này."], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "NOT_AVAILABLE", reason: "CAPABILITY_DENIED" };

  const isTermination = /terminate|dismiss|fire|chấm dứt|cho nghỉ|đuổi/i.test(`${request.toolName} ${request.action}`);
  const isDelete = /delete|destroy|xóa vĩnh viễn/i.test(`${request.toolName} ${request.action}`);
  const isPermissionChange = /permission|role|quyền|admin/i.test(`${request.toolName} ${request.action}`);
  const isDeploy = Boolean(request.requiresProductionChange) || /deploy|migration production|nâng cấp hệ thống/i.test(`${request.toolName} ${request.action}`);
  const isSensitiveRead = Boolean(request.includesMedicalData || request.includesPayrollData);

  if (isDelete) return { decision: "REQUIRE_APPROVAL", riskLevel: "L5", warningTitle: "Thao tác xóa không thể hoàn tác", consequences: [`Có thể ảnh hưởng ${request.recordCount ?? "nhiều"} bản ghi.`, "Lịch sử và bằng chứng có thể bị mất nếu không có archive."], requiredApprovals: 2, confirmationRequired: true, purposeRequired: true, rollback: "WORKFLOW_ONLY", reason: "DESTRUCTIVE_ACTION" };
  if (isTermination) return { decision: "REQUIRE_APPROVAL", riskLevel: "L5", warningTitle: "Thay đổi trạng thái nhân sự", consequences: ["Có thể khóa quyền truy cập và ảnh hưởng hồ sơ, lịch làm việc, lương, bàn giao.", "Đây là workflow cần hồ sơ và ngày hiệu lực; không xóa lịch sử."], requiredApprovals: 2, confirmationRequired: true, purposeRequired: true, rollback: "WORKFLOW_ONLY", reason: "EMPLOYMENT_ACTION" };
  if (isDeploy || isPermissionChange) return { decision: "REQUIRE_APPROVAL", riskLevel: "L5", warningTitle: isDeploy ? "Thay đổi hệ thống production" : "Thay đổi quyền truy cập", consequences: [isDeploy ? "Có thể làm gián đoạn dịch vụ hoặc thay đổi schema." : "Có thể mở rộng quyền xem/sửa dữ liệu nhạy cảm."], requiredApprovals: 2, confirmationRequired: true, purposeRequired: true, rollback: "WORKFLOW_ONLY", reason: isDeploy ? "PRODUCTION_CHANGE" : "PRIVILEGE_CHANGE" };
  if (isSensitiveRead) return { decision: "REQUIRE_CONFIRMATION", riskLevel: "L2", warningTitle: "Dữ liệu nhạy cảm", consequences: ["Yêu cầu sẽ được ghi audit theo người dùng, mục đích và phạm vi."], requiredApprovals: 0, confirmationRequired: true, purposeRequired: true, allowedFields: request.includesMedicalData ? medicalFields : ["userId", "month", "baseSalary", "commission", "bonus"], rollback: "SUPPORTED", reason: "SENSITIVE_READ" };
  if (request.irreversible || (request.amount ?? 0) > 0) return { decision: "REQUIRE_CONFIRMATION", riskLevel: "L4", warningTitle: "Thao tác có hậu quả tài chính hoặc khó hoàn tác", consequences: [`Giá trị/tác động dự kiến: ${request.amount ?? "chưa xác định"}.`, `Phạm vi: ${request.recordCount ?? 1} bản ghi.`], requiredApprovals: 1, confirmationRequired: true, purposeRequired: false, rollback: "SUPPORTED", reason: "CONSEQUENTIAL_WRITE" };
  if (request.action.startsWith("read")) return { decision: "ALLOW", riskLevel: "L1", consequences: [], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "SUPPORTED", reason: "SCOPED_READ" };
  return { decision: "WARN", riskLevel: "L3", warningTitle: "AI đang tạo bản nháp", consequences: ["Kết quả chưa có hiệu lực và chưa thay đổi dữ liệu thật."], requiredApprovals: 0, confirmationRequired: false, purposeRequired: false, rollback: "SUPPORTED", reason: "DRAFT_ONLY" };
}

export function maskSensitiveRecord(record: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, allowedFields.includes(key) ? value : "[ĐÃ ẨN THEO POLICY]"]));
}
