"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { aiConfigured, generateStructured } from "@/lib/ai";
import { getAssistantContext } from "@/lib/assistant-data";
import { ASSISTANT_FINAL_SYSTEM, ASSISTANT_PLANNER_SYSTEM, BUSINESS_RULES_KNOWLEDGE, formatAssistantContext } from "@/lib/assistant";
import { getPayroll } from "@/lib/payroll";
import { formatVND } from "@/lib/money";
import { isMonthClosed } from "@/lib/accounting";
import { audit, auditRequired } from "@/lib/audit";
import { savePayroll, saveBulkPayroll } from "../luong/actions";
import { addPayment, addFollowUp, saveConsultationRecord, restoreMaterialUsageStock } from "../ho-so/actions";
import { updateCustomer } from "../khach-hang/actions";
import { createPaymentRequest, approvePaymentRequest, rejectPaymentRequest, markPaymentRequestPaid } from "../ke-toan/de-nghi-thanh-toan/actions";
import { bulkUpsertAttendance } from "../cham-cong/actions";
import { createAppointment } from "../lich-hen/actions";
import { summarizeCase } from "@/lib/financial-summary";
import { getFinancialHealthIssues } from "@/lib/financial-health-db";
import { getAssistantFileContext } from "./file-actions";
import { appendAssistantTurn, getAssistantConversationContext, getOrCreateAssistantConversation, maybeCompactAssistantConversation } from "./conversations";
import { inferAttendanceIntent } from "./attendance-intent";
import type { Prisma } from "@/generated/prisma/client";
import { evaluateDispatcherAction, governanceMessage, principalForUser } from "@/lib/ai-governance-adapter";
import type { AiWorkspaceContext } from "@/lib/ai-governance";
import { getAiWorkspaceActionError } from "@/lib/ai-workspace-boundary";
import { applyClarificationChoice, buildClarificationPayload, clarificationAnswer, findActiveClarificationPayload, parseClarificationChoice, type ClarificationPayload } from "@/lib/ai-clarification";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const actionNames = [
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

type ActionName = (typeof actionNames)[number];

type PlannerStep = {
  action: ActionName;
  arguments_json: string;
  requires_confirmation: boolean;
  note?: string;
};

type PlannerOutput = {
  reply: string;
  action: ActionName;
  arguments_json: string;
  requires_confirmation: boolean;
  preview: string;
  steps?: PlannerStep[];
};

export type AgentState = {
  ok?: boolean;
  answer?: string;
  error?: string;
  steps?: string[];
  approval?: { id: string; toolName: string; preview: string; expiresAt: string; workspaceKind: "INTERNAL" | "PROJECT" | "GLOBAL"; projectId?: string };
  exportUrl?: string;
  conversationId?: string;
  clarification?: ClarificationPayload;
  clarificationDraft?: {
    status: "DRAFT";
    selected: "A" | "B" | "C" | "D";
    label: string;
    impact: string;
    draftConfig: Record<string, string | number | boolean>;
    evidence: { source: "user"; text: string; choice: "A" | "B" | "C" | "D" };
    nextQuestions: string[];
  };
};

const plannerSchema = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Câu trả lời bằng tiếng Việt theo giọng một đồng nghiệp số: xưng em, gọi người dùng là anh, nói thẳng đã kiểm tra bước nào và bước nào còn chờ. Nếu action=none, giải thích trực tiếp; nếu là thao tác ghi, tuyệt đối không nói đã thực hiện vì approval chưa APPROVED." },
    action: { type: "string", enum: actionNames },
    arguments_json: { type: "string", description: "JSON object chứa tham số của action; nếu none thì {}." },
    requires_confirmation: { type: "boolean" },
    preview: { type: "string", description: "Bản xem trước tác động; để trống nếu action là đọc." },
    steps: {
      type: "array",
      maxItems: 4,
      description: "Tối đa 4 bước chỉ đọc cho yêu cầu nhiều phần; không dùng steps cho chuỗi mutation.",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: actionNames },
          arguments_json: { type: "string" },
          requires_confirmation: { type: "boolean" },
          note: { type: "string" },
        },
        required: ["action", "arguments_json", "requires_confirmation"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "action", "arguments_json", "requires_confirmation", "preview"],
  additionalProperties: false,
};

const priorityArgs = z.object({ days: z.number().int().min(1).max(90).optional() });

const payrollReadArgs = z.object({
  staffName: z.string().min(1).max(120),
  month: monthSchema.optional(),
});
const customerLookupArgs = z.object({ customerCode: z.string().trim().min(2).max(40) });
const customerUpdateArgs = z.object({
  customerCode: z.string().trim().min(2).max(40),
  fullName: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().trim().max(20).optional(),
  source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]).optional(),
  sourceDetail: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
  allergies: z.string().trim().max(2000).optional(),
  medicalHistory: z.string().trim().max(3000).optional(),
  contraindications: z.string().trim().max(3000).optional(),
}).refine((data) => Object.keys(data).some((key) => key !== "customerCode" && data[key as keyof typeof data] !== undefined), { message: "Cần nêu ít nhất một trường muốn sửa." });
const createPaymentRequestArgs = z.object({
  type: z.enum(["EXPENSE", "SALARY", "COLLABORATOR", "STAFF_OTHER"]), payeeName: z.string().trim().min(1).max(200), payeeUserId: z.string().trim().optional(), amount: z.number().int().positive(), reason: z.string().trim().min(3).max(1000), month: monthSchema.optional(), category: z.string().trim().max(50).optional(), note: z.string().trim().max(1000).optional(),
});
const paymentRequestArgs = z.object({ requestNo: z.string().trim().min(3).max(60) });
const rejectPaymentArgs = paymentRequestArgs.extend({ reason: z.string().trim().min(3).max(500) });
const payPaymentArgs = paymentRequestArgs.extend({ method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]), occurredAt: z.string().min(10).optional() });
const consultationArgs = z.object({
  caseCode: z.string().trim().min(2).max(40),
  weightKg: z.number().min(0).max(500).optional(), heightCm: z.number().min(0).max(250).optional(), bloodType: z.string().max(20).optional(),
  emergencyName: z.string().max(120).optional(), emergencyPhone: z.string().max(40).optional(), pulse: z.number().int().min(0).max(300).optional(),
  bloodPressure: z.string().max(30).optional(), temperatureC: z.number().min(0).max(50).optional(), respiratoryRate: z.number().int().min(0).max(100).optional(), spo2: z.number().int().min(0).max(100).optional(),
  screeningJson: z.string().max(10000).optional(), patientConfirmed: z.boolean().optional(), wants: z.string().max(3000).optional(), currentCondition: z.string().max(3000).optional(), expectedResult: z.string().max(3000).optional(), doctorIndication: z.string().max(3000).optional(),
}).refine((data) => Object.keys(data).some((key) => key !== "caseCode" && data[key as keyof typeof data] !== undefined), { message: "Cần nêu ít nhất một trường sổ tư vấn muốn cập nhật." });
const payrollExportArgs = z.object({
  month: monthSchema,
  format: z.enum(["xlsx", "doc", "csv"]),
  standardDays: z.number().int().min(1).max(31).optional(),
});
const savePayrollArgs = z.object({
  staffName: z.string().min(1).max(120),
  month: monthSchema,
  baseSalary: z.number().int().min(0).optional(),
  commissionOverride: z.number().int().min(0).default(0),
  bonus: z.number().int().min(0),
  adjustment: z.number().int(),
});
const bulkRowArgs = z.object({
  staffName: z.string().min(1).max(120),
  commissionOverride: z.number().int().min(0).default(0),
  bonus: z.number().int().min(0),
  adjustment: z.number().int(),
});
const bulkPayrollArgs = z.object({ month: monthSchema, rows: z.array(bulkRowArgs).min(1).max(100) });
const paymentArgs = z.object({ caseCode: z.string().min(1).max(40), amount: z.number().int().positive(), method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]), note: z.string().max(500).optional() });
const followUpArgs = z.object({ caseCode: z.string().min(1).max(40), scheduledAt: z.string().min(10), note: z.string().max(500).optional() });
const appointmentArgs = z.object({ guestName: z.string().min(1).max(120), phoneLast5: z.string().regex(/^\d{5}$/).optional(), scheduledAt: z.string().min(10), type: z.enum(["NEW", "FOLLOW_UP", "RE_SERVICE"]), serviceInterest: z.string().max(200).optional(), source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]), sourceDetail: z.string().max(200).optional(), consultantName: z.string().max(120).optional(), note: z.string().max(500).optional() });
const changeArgs = z.object({ request: z.string().min(5).max(2000) });
const workPlanArgs = z.object({
  goal: z.string().trim().min(5).max(300),
  tasks: z.array(z.object({ title: z.string().trim().min(2).max(180), note: z.string().trim().max(1000).optional(), subtasks: z.array(z.object({ title: z.string().trim().min(2).max(180), note: z.string().trim().max(1000).optional() })).max(8).default([]) })).min(1).max(12),
});
const attendanceArgs = z.object({
  staffName: z.string().min(1).max(120),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(62),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/),
  checkOut: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  note: z.string().max(500).optional(),
});

const nowMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const jsonArgs = (raw: string): unknown => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
};
const norm = (s: string) => s.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const INTERNAL_AI_WORKSPACE: AiWorkspaceContext = { workspaceKind: "INTERNAL", label: "Nội Bộ" };
const GLOBAL_AI_WORKSPACE: AiWorkspaceContext = { workspaceKind: "GLOBAL", label: "Toàn hệ thống" };

async function resolveAiWorkspace(user: { id: string; role: string }, rawProjectId: string): Promise<AiWorkspaceContext | null> {
  const projectId = rawProjectId.trim();
  if (!projectId) return INTERNAL_AI_WORKSPACE;
  if (projectId === "__GLOBAL__") return user.role === "ADMIN" && process.env.ENABLE_ZENITH_V2 === "true" ? GLOBAL_AI_WORKSPACE : null;
  if (process.env.ENABLE_ZENITH_V2 !== "true") return null;
  const project = await prisma.zProject.findFirst({
    where: user.role === "ADMIN" ? { id: projectId } : { id: projectId, members: { some: { userId: user.id, active: true } } },
    select: { id: true, name: true, code: true },
  });
  return project ? { workspaceKind: "PROJECT", projectId: project.id, label: `${project.code} · ${project.name}` } : null;
}

async function getAiPrincipal(user: { id: string; role: string }, workspace: AiWorkspaceContext = INTERNAL_AI_WORKSPACE) {
  const projectIds = process.env.ENABLE_ZENITH_V2 === "true"
    ? user.role === "ADMIN"
      ? (await prisma.zProject.findMany({ select: { id: true } })).map((row) => row.id)
      : (await prisma.zProjectMember.findMany({ where: { userId: user.id, active: true }, select: { projectId: true } })).map((row) => row.projectId)
    : [];
  return principalForUser(user, projectIds, workspace);
}

function governanceBlock(principal: ReturnType<typeof principalForUser>, action: string, args: unknown, confirmationRequested: boolean, confirmationStage = false): string | null {
  const policy = evaluateDispatcherAction(principal, action, args);
  if (policy.decision === "DENY") return governanceMessage(policy);
  if (policy.requiredApprovals > 1) return `${governanceMessage(policy)} Workflow hai phê duyệt chưa được nối vào luồng hiện tại, nên em dừng và không tạo preview một người có thể xác nhận.`;
  if (policy.purposeRequired && (!args || typeof args !== "object" || typeof (args as Record<string, unknown>).purpose !== "string" || !(args as Record<string, unknown>).purpose)) {
    return `${governanceMessage(policy)} Anh cần nêu mục đích và phạm vi tối thiểu trong yêu cầu; em chưa đọc/ghi dữ liệu.`;
  }
  if (policy.confirmationRequired && !confirmationRequested) return `${governanceMessage(policy)} Em cần tạo preview và chờ xác nhận rõ ràng trước khi tiếp tục.`;
  return null;
}

const actionHelp = `
Công cụ được phép:
- get_business_summary: đọc tổng quan vận hành Nội Bộ.
- get_workspace_overview: ADMIN ở phạm vi GLOBAL đọc aggregate của mọi Dự án (trạng thái, số task; không trả toàn bộ bản ghi).
- get_payroll_row: xem bảng lương của một nhân sự theo tháng; args {staffName, month?}.
- get_customer_profile: đọc hồ sơ khách theo mã, chỉ hiển thị 5 số cuối điện thoại và dữ liệu được phép; args {customerCode}.
- get_debt_summary: đọc tổng công nợ hiện tại.
- get_lead_priorities: xếp khách đang tư vấn/cân nhắc theo khả năng cần gọi lại; args {days?}.
- get_financial_alerts: đọc các hồ sơ có dấu hiệu lệch tiền, trả vượt hoặc snapshot cũ.
- prepare_payroll_export: chuẩn bị link xuất bảng lương; args {month, format: xlsx|doc|csv, standardDays?}.
- bulk_upsert_attendance: chấm công hàng loạt cho một nhân sự theo các ngày cụ thể; args {staffName, dates:[yyyy-MM-dd], checkIn:"08:00", checkOut:"17:00", note?}. ADMIN/MANAGER xác nhận một lần; upsert không tạo bản ghi trùng.
- save_payroll: sửa lương/điều chỉnh hoa hồng ngoài công thức/thưởng/điều chỉnh một nhân sự; args {staffName, month, baseSalary?, commissionOverride, bonus, adjustment}. Hoa hồng tự động theo thực thu không nhập lại. Luôn cần ADMIN xác nhận.
- save_bulk_payroll: sửa nhiều nhân sự; args {month, rows:[{staffName, commissionOverride, bonus, adjustment}]}. Luôn cần ADMIN xác nhận.
- record_payment: ghi nhận khoản thu cho hồ sơ; args {caseCode, amount, method, note}. Luôn xem trước và xác nhận.
- create_follow_up: tạo lịch chăm sóc/tái khám; args {caseCode, scheduledAt, note}. Luôn xem trước và xác nhận.
- create_appointment: tạo lịch hẹn; args {guestName, phoneLast5?, scheduledAt, type, serviceInterest?, source, sourceDetail?, consultantName?, note?}. Luôn xem trước và xác nhận.
- update_customer_profile/delete_customer: ADMIN sửa hoặc xóa hồ sơ khách theo mã chính xác; xóa là vĩnh viễn, hoàn kho trước và luôn xem trước.
- update_consultation_record: ADMIN/nhân sự có quyền cập nhật Sổ tư vấn; AI luôn preview, áp dụng đúng khóa 24 giờ của hệ thống.
- create_payment_request: lập Đề nghị thanh toán PENDING, dùng cả khoản nhỏ như gói tăm 3.000đ; args {type, payeeName, amount, reason, month?, category?, note?}.
- approve_payment_request/reject_payment_request/pay_payment_request: ADMIN quản lý trạng thái Đề nghị thanh toán; chỉ ghi sổ khi chứng từ đã duyệt, luôn preview.
- propose_system_change: ghi đề xuất đổi cơ chế/code thành kế hoạch để duyệt; args {request}.
- create_work_plan: chia một mục tiêu thành nhiệm vụ chính/phụ và lưu vào Kế hoạch; args {goal, tasks:[{title, note?, subtasks:[{title,note?}]}]}. Luôn preview trước khi lưu.
Không tự đoán tên người, tháng, số tiền; nếu thiếu thì action=none và hỏi lại. Không gọi tool khác, không viết SQL, không sửa file trực tiếp.`;

async function buildPlannerPrompt(question: string, userId: string, role: string, history: string, workspace: AiWorkspaceContext): Promise<string> {
  const context = workspace.workspaceKind === "INTERNAL" ? await getAssistantContext() : null;
  const fileContext = workspace.workspaceKind === "INTERNAL" ? await getAssistantFileContext(userId) : "File context bị tắt trong Dự án cho đến khi có adapter project-local đã kiểm thử.";
  const accessNote = role === "ADMIN"
    ? "Người dùng hiện tại là ADMIN. Có thể dùng dữ liệu nghiệp vụ được cấp trong các read tool và toàn bộ kiến thức vận hành dưới đây để trả lời có căn cứ."
    : "Người dùng không phải ADMIN. Chỉ dùng số liệu tổng hợp và quy tắc không nhạy cảm; không suy đoán hoặc tiết lộ chi tiết lương, hồ sơ hay dữ liệu bị giới hạn.";
  const workspaceNote = workspace.workspaceKind === "PROJECT"
    ? `DỰ ÁN ĐANG CHỌN: ${workspace.label ?? workspace.projectId}. Chỉ được dùng dữ liệu/projectId đúng bằng ${workspace.projectId}. Các tool clinic-global hiện chưa có adapter dữ liệu Dự án; nếu tool không khai báo projectId thì phải dừng, không đọc dữ liệu Nội Bộ và không đoán dữ liệu.`
    : workspace.workspaceKind === "GLOBAL"
      ? "PHẠM VI TOÀN HỆ THỐNG: Người dùng là Global Admin. Có thể dùng aggregate tool trên mọi Dự án và chọn projectId cụ thể cho từng thao tác. Không dùng tool nghiệp vụ thiếu projectId vì như vậy sẽ rơi nhầm về Nội Bộ; không trả toàn bộ bản ghi nhạy cảm trong một lần đọc."
      : "WORKSPACE ĐANG CHỌN: Nội Bộ. Không tự ý đọc dữ liệu của bất kỳ Dự án nào nếu người dùng chưa chọn Dự án và nêu rõ phạm vi.";
  return `${actionHelp}\n\nPHẠM VI WORKSPACE:\n${workspaceNote}\n\nQUYỀN TRUY CẬP:\n${accessNote}\n\nKIẾN THỨC VẬN HÀNH ĐÃ XÁC NHẬN:\n${BUSINESS_RULES_KNOWLEDGE}\n\nBỐI CẢNH SỐ LIỆU HIỆN TẠI:\n${context ? formatAssistantContext(context) : "Chưa có snapshot dữ liệu Dự án; không được suy ra hoặc dùng số liệu Nội Bộ."}\n\n${fileContext}\n\nLỊCH SỬ PHIÊN GẦN ĐÂY:\n${history || "Chưa có lịch sử."}\n\nYÊU CẦU MỚI NHẤT CỦA ANH:\n${question}\n\nNếu lịch sử đã cung cấp đủ tên, tháng, ngày hoặc điều kiện mà câu mới chỉ bổ sung xác nhận (ví dụ 'chưa nghỉ ngày nào', 'làm đi', 'anh là admin'), phải ghép ngữ cảnh và tiếp tục cùng action, không hỏi lại. Nếu câu mới nêu nhân sự khác, nhân sự mới luôn ghi đè nhân sự cũ; không giữ preview cũ. Nếu yêu cầu chấm công/ghi dữ liệu rõ ràng, chọn đúng tool thực thi; không dùng propose_system_change để thay cho thao tác nghiệp vụ. Chỉ dùng propose_system_change khi anh thực sự yêu cầu đổi code/cơ chế hệ thống. Yêu cầu sửa/ghi dữ liệu phải đặt requires_confirmation=true. Với câu hỏi 'đã làm chưa', hãy đối chiếu trạng thái approval thật thay vì đoán từ lịch sử hội thoại.`;
}

function getCaseFinancialTotal(record: { services: Array<{ listPrice: unknown; unitPrice: unknown; quantity: unknown; discount: unknown; finalPrice: unknown }>; payments: Array<{ amount: unknown }>; voucherAmount: unknown }) {
  const total = record.services.reduce((sum, service) => {
    const unit = Number(service.unitPrice) || Number(service.listPrice) || 0;
    const quantity = Number(service.quantity) || 1;
    const discount = Number(service.discount) || 0;
    return sum + Math.max(unit * quantity - discount, 0);
  }, 0) - Math.max(Number(record.voucherAmount) || 0, 0);
  const paid = record.payments.reduce((sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0), 0);
  return { total: Math.max(total, 0), paid, debt: Math.max(total - paid, 0) };
}

function planError(message: string): AgentState {
  return { error: message, steps: ["Đọc yêu cầu", "Kiểm tra điều kiện", "Dừng lại và báo rõ lý do"] };
}

function workflowSteps(action: ActionName, stage: "read" | "preview" | "done" = "read") {
  const labels = action === "none"
    ? ["Đọc yêu cầu và lịch sử", "Đối chiếu quy tắc vận hành", "Soạn câu trả lời có căn cứ"]
    : stage === "read"
      ? ["Đọc yêu cầu và lịch sử", "Đối chiếu dữ liệu thật và quyền", "Chuẩn bị thông tin trả lời"]
      : stage === "preview"
        ? ["Đọc yêu cầu và lịch sử", "Đối chiếu dữ liệu thật và quyền", "Lập bản xem trước; chờ ADMIN xác nhận"]
        : ["Đối chiếu lại approval", "Thực thi action nghiệp vụ thật", "Ghi audit và báo cáo kết quả"];
  return labels;
}

const finalAnswerSchema = {
  type: "object",
  properties: { answer: { type: "string", description: "Câu trả lời cuối bằng tiếng Việt, có quy tắc và các bước cụ thể; không nói chung chung là đã hiểu." } },
  required: ["answer"],
  additionalProperties: false,
};

function knowledgeAnswerFallback(question: string): string {
  const q = norm(question);
  const parts: string[] = [];
  if (q.includes("hoa hong") || q.includes("thuc thu") || q.includes("tra gop") || q.includes("tra 5 trieu")) {
    parts.push("Hoa hồng được tính theo tiền khách thực tế đã thanh toán từng lần, không tính theo giá dịch vụ đã chốt. Ví dụ dịch vụ 100.000.000đ nhưng khách trả 5.000.000đ trong tháng này thì kỳ này chỉ lấy 5.000.000đ làm căn cứ hoa hồng; các lần trả sau tính ở kỳ tương ứng. Nếu một người kiêm nhiều vai trò, doanh thu không nhân đôi; nếu có phối hợp tư vấn thì phần thực thu được phân bổ theo tỷ lệ/phân công đã lưu.");
  }
  if (q.includes("de nghi") || q.includes("tam") || q.includes("thu chi") || q.includes("3.000") || q.includes("3000")) {
    parts.push("Khoản chi nhỏ như mua gói tăm 3.000đ vẫn có thể lập Đề nghị thanh toán ngay từ Sổ thu–chi. Phiếu ở trạng thái PENDING nên chưa tạo dòng chi; sau khi ADMIN duyệt, chọn đã thanh toán thì hệ thống mới tạo đúng một CashTransaction EXPENSE và liên kết ngược với số phiếu. Dòng đã liên kết không sửa/xóa trực tiếp từ Sổ thu–chi để tránh ghi trùng; xem/in chứng từ tại Kế toán hoặc Đề nghị thanh toán.");
  }
  return parts.join("\n\n");
}

async function buildFinalKnowledgeAnswer(question: string, role: string, plannerReply: string, verifiedResults: string[] = []): Promise<string> {
  const fallback = knowledgeAnswerFallback(question);
  const context = await getAssistantContext();
  const verifiedResult = verifiedResults.filter(Boolean).join("\n\n---\n\n");
  const accessNote = role === "ADMIN" ? "Người dùng là ADMIN; được dùng kiến thức vận hành và số liệu tổng hợp hiện tại để giải thích." : "Chỉ trả lời trong phạm vi quyền người dùng; không tiết lộ dữ liệu bị giới hạn.";
  const generated = await generateStructured<{ answer: string }>({
    system: ASSISTANT_FINAL_SYSTEM,
    prompt: `${accessNote}\n\nKIẾN THỨC VẬN HÀNH:\n${BUSINESS_RULES_KNOWLEDGE}\n\nSỐ LIỆU TỔNG HỢP HIỆN TẠI:\n${formatAssistantContext(context)}\n\nKẾT QUẢ TOOL ĐÃ KIỂM CHỨNG (nếu có):\n${verifiedResult || "Không có tool đọc; chỉ trả lời từ kiến thức và policy."}\n\nCÂU HỎI:\n${question}\n\nCÂU TRẢ LỜI DỰ KIẾN CỦA PLANNER:\n${plannerReply}\n\nHãy viết câu trả lời hoàn chỉnh theo thứ tự: kết luận trực tiếp, bằng chứng/số liệu đã kiểm tra, rồi bước tiếp theo hoặc điểm cần anh xác nhận. Khi có nhiều kết quả tool, hãy hợp nhất thành một mạch trả lời, không lặp từng tool như nhật ký. Không lặp prompt, không thêm dữ kiện ngoài nguồn đã cung cấp. Nếu có kết quả tool thì coi đó là sự thật ưu tiên.`,
    schemaName: "zenith_agent_final_answer",
    schema: finalAnswerSchema,
    maxTokens: 900,
    model: process.env.AI_WRITER_MODEL?.trim() || undefined,
  });
  const answer = generated.ok ? generated.data.answer.trim() : "";
  const generic = !answer || (norm(answer).includes("da hieu yeu cau") && !norm(answer).includes("hoa hong") && !norm(answer).includes("de nghi"));
  return generic ? (fallback || (verifiedResult ? verifiedResults.filter(Boolean).join("\n\n") : "") || plannerReply) : answer;
}

async function findCase(caseCode: string) {
  const exact = await prisma.caseRecord.findUnique({
    where: { code: caseCode.trim() },
    select: { id: true, code: true, customerId: true, customer: { select: { fullName: true } }, services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }, payments: { select: { amount: true } }, voucherAmount: true },
  });
  if (exact) return { record: exact, choices: [] as string[] };
  const partial = await prisma.caseRecord.findMany({ where: { code: { contains: caseCode.trim(), mode: "insensitive" } }, take: 5, select: { code: true } });
  return { record: null, choices: partial.map((row) => row.code) };
}

async function findStaff(staffName: string) {
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true, role: true, baseSalary: true } });
  const exact = users.find((u) => norm(u.fullName) === norm(staffName));
  if (exact) return { user: exact, choices: [] as string[] };
  const partial = users.filter((u) => norm(u.fullName).includes(norm(staffName)) || norm(staffName).includes(norm(u.fullName)));
  return { user: partial.length === 1 ? partial[0] : null, choices: partial.map((u) => u.fullName) };
}

async function findCustomer(customerCode: string) {
  const exact = await prisma.customer.findUnique({
    where: { code: customerCode.trim() },
    select: { id: true, code: true, fullName: true, phoneLast5: true, gender: true, dob: true, source: true, sourceDetail: true, address: true, note: true, allergies: true, medicalHistory: true, contraindications: true },
  });
  if (exact) return { customer: exact, choices: [] as string[] };
  const partial = await prisma.customer.findMany({ where: { code: { contains: customerCode.trim(), mode: "insensitive" } }, take: 5, select: { code: true, fullName: true } });
  return { customer: null, choices: partial.map((row) => `${row.code} — ${row.fullName}`) };
}

async function deleteCustomerForAgent(userId: string, customerId: string) {
  await prisma.$transaction(async (tx) => {
    const usages = await tx.materialUsage.findMany({ where: { case: { customerId } }, select: { materialId: true, quantity: true } });
    await restoreMaterialUsageStock(tx, usages, userId, "Hoàn kho (AI xóa khách hàng)");
    await tx.payment.deleteMany({ where: { case: { customerId } } });
    await tx.caseService.deleteMany({ where: { case: { customerId } } });
    await tx.materialUsage.deleteMany({ where: { case: { customerId } } });
    await tx.followUp.deleteMany({ where: { customerId } });
    await tx.photo.deleteMany({ where: { customerId } });
    await tx.careMessage.deleteMany({ where: { customerId } });
    await tx.appointment.deleteMany({ where: { customerId } });
    await tx.caseRecord.deleteMany({ where: { customerId } });
    await tx.customer.delete({ where: { id: customerId } });
    await auditRequired(tx, userId, "DELETE_CUSTOMER", { entity: "Customer", entityId: customerId, meta: { source: "ASSISTANT_ADMIN_GATEWAY" } });
  });
}

async function readAction(action: ActionName, args: unknown, userId: string, workspace: AiWorkspaceContext): Promise<AgentState> {
  const boundaryError = getAiWorkspaceActionError(workspace, action);
  if (boundaryError) return planError(boundaryError);
  if (action === "get_workspace_overview") {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return planError("Chỉ Global Admin được đọc tổng hợp toàn bộ Dự án.");
    const projects = await prisma.zProject.findMany({
      orderBy: { name: "asc" },
      take: 2_000,
      select: { id: true, code: true, name: true, status: true, updatedAt: true, _count: { select: { workspaceTasks: true } } },
    });
    const active = projects.filter((project) => project.status === "ACTIVE").length;
    const taskTotal = projects.reduce((sum, project) => sum + project._count.workspaceTasks, 0);
    const rows = projects.slice(0, 100).map((project) => `${project.code} · ${project.name} · ${project.status} · ${project._count.workspaceTasks} task`).join("\\n");
    const truncated = projects.length > 100 ? `\\n\\n(Đang hiển thị 100/${projects.length} Dự án; muốn xem chi tiết hãy chọn projectId cụ thể.)` : "";
    return { ok: true, answer: `Tổng quan toàn hệ thống: ${projects.length} Dự án trong phạm vi Admin, ${active} Dự án ACTIVE, ${taskTotal} Task project-local.\\n\\n${rows || "Chưa có Dự án."}${truncated}` };
  }
  if (action === "get_business_summary") {
    const context = await getAssistantContext();
    return { ok: true, answer: `Tôi đã đọc số liệu hiện tại.\n\n${formatAssistantContext(context)}` };
  }
  if (action === "get_debt_summary") {
    const context = await getAssistantContext();
    return { ok: true, answer: `Công nợ hiện tại: ${formatVND(context.debtTotal)} trên ${context.debtCount} hồ sơ.\n\n${context.topDebtors.map((d) => `- ${d.name}: ${formatVND(d.amount)}`).join("\n") || "Chưa có hồ sơ công nợ trong dữ liệu tổng hợp."}` };
  }
  if (action === "get_lead_priorities") {
    const parsed = priorityArgs.safeParse(args);
    const days = parsed.success ? parsed.data.days ?? 30 : 30;
    const since = new Date(Date.now() - days * 86_400_000);
    const cases = await prisma.caseRecord.findMany({
      where: { createdAt: { gte: since }, consultResult: { in: ["PENDING", "CONSIDERING"] }, status: { in: ["OPEN", "CONSULTED"] } },
      orderBy: { updatedAt: "desc" }, take: 100,
      select: { code: true, consultResult: true, createdAt: true, customer: { select: { fullName: true } }, services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }, payments: { select: { amount: true } }, voucherAmount: true },
    });
    const rows = cases.map((row) => {
      const f = summarizeCase({ services: row.services, payments: row.payments, voucherAmount: row.voucherAmount });
      const age = Math.max(0, Math.floor((Date.now() - row.createdAt.getTime()) / 86_400_000));
      const score = (row.consultResult === "CONSIDERING" ? 55 : 40) + (age <= 3 ? 25 : age <= 7 ? 15 : 5) + (f.total >= 20_000_000 ? 20 : f.total >= 5_000_000 ? 10 : 5);
      return { ...row, total: f.total, debt: f.debt, score };
    }).sort((a, b) => b.score - a.score).slice(0, 10);
    return { ok: true, answer: rows.length ? `Danh sách khách nên ưu tiên gọi lại trong ${days} ngày:\n\n${rows.map((r, i) => `${i + 1}. ${r.customer.fullName} · ${r.code} · điểm ${r.score}/100 · hồ sơ ${formatVND(r.total)} · còn nợ ${formatVND(r.debt)} · ${r.consultResult === "CONSIDERING" ? "đang cân nhắc" : "chưa chốt"}`).join("\n")}` : `Không có khách đang cân nhắc/chưa chốt trong ${days} ngày gần đây.` };
  }
  if (action === "get_financial_alerts") {
    const issues = await getFinancialHealthIssues();
    return { ok: true, answer: issues.length ? `Có ${issues.length} cảnh báo tài chính:\n\n${issues.slice(0, 15).map((i) => `- ${i.caseCode} · ${i.customerName}: ${i.message}`).join("\n")}` : "Không phát hiện cảnh báo tài chính trong dữ liệu gần đây." };
  }
  if (action === "get_customer_profile") {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return planError("Chỉ ADMIN được đọc chi tiết hồ sơ khách qua Trợ lý AI.");
    const parsed = customerLookupArgs.safeParse(args);
    if (!parsed.success) return planError("Cần mã hồ sơ khách chính xác.");
    const found = await findCustomer(parsed.data.customerCode);
    if (!found.customer) return planError(found.choices.length ? `Có mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy hồ sơ khách.");
    const cases = await prisma.caseRecord.findMany({ where: { customerId: found.customer.id }, orderBy: { createdAt: "desc" }, take: 10, select: { code: true, status: true, createdAt: true, services: { select: { listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } }, payments: { select: { amount: true } }, voucherAmount: true } });
    const totals = cases.reduce((sum, row) => { const f = getCaseFinancialTotal(row); return { total: sum.total + f.total, paid: sum.paid + f.paid, debt: sum.debt + f.debt }; }, { total: 0, paid: 0, debt: 0 });
    return { ok: true, answer: `Hồ sơ ${found.customer.fullName} (${found.customer.code})\n- Điện thoại: ******${found.customer.phoneLast5}\n- Giới tính/ngày sinh: ${found.customer.gender ?? "chưa nhập"} / ${found.customer.dob ? found.customer.dob.toLocaleDateString("vi-VN") : "chưa nhập"}\n- Nguồn: ${found.customer.source}${found.customer.sourceDetail ? ` — ${found.customer.sourceDetail}` : ""}\n- Tiền sử/dị ứng/chống chỉ định: ${found.customer.medicalHistory || "chưa nhập"} / ${found.customer.allergies || "chưa nhập"} / ${found.customer.contraindications || "chưa nhập"}\n- Hồ sơ điều trị gần đây: ${cases.map((row) => `${row.code} (${row.status}, ${formatVND(getCaseFinancialTotal(row).paid)} đã thu, còn ${formatVND(getCaseFinancialTotal(row).debt)})`).join("; ") || "chưa có"}\n- Tổng theo các hồ sơ gần đây: đã thu ${formatVND(totals.paid)}, còn nợ ${formatVND(totals.debt)}.` };
  }
  if (action === "get_payroll_row") {
    const parsed = payrollReadArgs.safeParse(args);
    if (!parsed.success) return planError("Cần cho biết tên nhân sự; tháng có thể bỏ trống để xem tháng hiện tại.");
    const month = parsed.data.month ?? nowMonth();
    const found = await findStaff(parsed.data.staffName);
    if (!found.user) return planError(found.choices.length ? `Có nhiều tên gần giống: ${found.choices.join(", ")}. Anh hãy nói rõ người cần xem.` : "Không tìm thấy nhân sự đó.");
    const payroll = await getPayroll(new Date(`${month}-01T00:00:00`));
    const row = payroll.rows.find((r) => r.id === found.user!.id);
    if (!row) return planError(`Không có dữ liệu lương của ${found.user.fullName} trong tháng ${month}.`);
    return {
      ok: true,
      answer: `Bảng lương ${found.user.fullName} — ${month}\n- Ngày công: ${row.daysWorked}/${payroll.standardDays}\n- Lương cứng thực nhận: ${formatVND(row.baseActual)}\n- Thực thu tư vấn: ${formatVND(row.collectedConsult.total)}\n- Thực thu bác sĩ: ${formatVND(row.collectedDoctor.total)}\n- Công nợ khách phụ trách: ${formatVND(row.debtOutstanding)}\n- Hoa hồng theo thực thu + điều chỉnh: ${formatVND(row.commission)} (tự động ${formatVND(row.autoCommission)}; điều chỉnh ${formatVND(row.commissionOverride)})\n- Thưởng/điều chỉnh: ${formatVND(row.bonus + row.adjustment)}\n- Tổng nhận: ${formatVND(row.total)}`,
    };
  }
  if (action === "prepare_payroll_export") {
    const parsed = payrollExportArgs.safeParse(args);
    if (!parsed.success) return planError("Cần đủ tháng, định dạng xlsx/doc/csv để xuất bảng lương.");
    const d = parsed.data.standardDays ?? 26;
    return { ok: true, exportUrl: `/luong/export?format=${parsed.data.format}&m=${parsed.data.month}&d=${d}`, answer: `Đã chuẩn bị link xuất bảng lương tháng ${parsed.data.month} định dạng ${parsed.data.format.toUpperCase()}. Anh bấm link tải file.` };
  }
  return planError("Tôi chưa có công cụ đọc phù hợp cho yêu cầu này.");
}

const READ_ACTIONS = new Set<ActionName>([
  "get_business_summary",
  "get_workspace_overview",
  "get_debt_summary",
  "get_lead_priorities",
  "get_financial_alerts",
  "get_payroll_row",
  "get_customer_profile",
  "prepare_payroll_export",
]);

function isBareApproval(text: string) {
  const value = norm(text).replace(/[.!?]+$/g, "").trim();
  return /^(xac nhan|thuc hien|lam di|lam ngay|dong y|cho phep|tien hanh|ok lam|duoc lam|xac nhan thuc hien)( nhe| di)?$/.test(value);
}

function isApprovalStatusQuestion(text: string) {
  const value = norm(text);
  return /(da (thuc hien|lam|xong)|xong chua|lam chua|thuc hien chua|bao cao anh)/.test(value) && !value.includes("cham cong") && !value.includes("sua") && !value.includes("tao");
}

async function latestConversationApproval(userId: string, conversationId: string, workspace: AiWorkspaceContext) {
  const approval = await prisma.assistantApproval.findFirst({ where: { userId, conversationId, workspaceKind: workspace.workspaceKind, projectId: workspace.projectId ?? null }, orderBy: { createdAt: "desc" } });
  if (approval?.status === "PENDING" && approval.expiresAt < new Date()) {
    return await prisma.assistantApproval.update({ where: { id: approval.id }, data: { status: "EXPIRED", resolvedAt: new Date() } });
  }
  return approval;
}

function approvalStatusAnswer(approval: { status: string; preview: Prisma.JsonValue; resolvedAt: Date | null }) {
  const preview = String(approval.preview);
  if (approval.status === "PENDING") return { answer: `Chưa thực hiện anh nhé. Em đã kiểm tra và đang giữ bản xem trước này chờ anh xác nhận:\n\n${preview}\n\nAnh có thể bấm “Xác nhận thực hiện” hoặc nhắn “làm đi”.`, steps: ["Tìm approval gần nhất", "Kiểm tra trạng thái còn PENDING", "Chờ ADMIN xác nhận"] };
  if (approval.status === "APPROVED") return { answer: `Đã thực hiện xong. Em đã ghi nhận kết quả theo bản xem trước sau đây:\n\n${preview}`, steps: ["Tìm approval gần nhất", "Đối chiếu trạng thái APPROVED", "Báo cáo kết quả đã thực hiện"] };
  if (approval.status === "REJECTED") return { answer: `Chưa thực hiện. Thao tác này đã được hủy nên dữ liệu không thay đổi:\n\n${preview}`, steps: ["Tìm approval gần nhất", "Đối chiếu trạng thái REJECTED", "Báo cáo dữ liệu không thay đổi"] };
  return { answer: `Chưa thực hiện. Bản xem trước đã hết hạn nên không ghi dữ liệu:\n\n${preview}`, steps: ["Tìm approval gần nhất", "Đối chiếu thời hạn", "Báo cáo đã hết hạn; không ghi dữ liệu"] };
}

async function createApproval(userId: string, toolName: string, args: Prisma.InputJsonValue, preview: string, conversationId: string | undefined, workspace: AiWorkspaceContext): Promise<AgentState> {
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  if (toolName === "bulk_upsert_attendance" && conversationId) {
    const superseded = await prisma.assistantApproval.updateMany({ where: { userId, conversationId, toolName, workspaceKind: workspace.workspaceKind, projectId: workspace.projectId ?? null, status: "PENDING" }, data: { status: "REJECTED", resolvedAt: new Date() } });
    if (superseded.count > 0) await audit(userId, "ASSISTANT_APPROVAL_SUPERSEDED", { entity: toolName, meta: { count: superseded.count, reason: "Yêu cầu chấm công mới thay thế preview cũ trong cùng workspace.", workspaceKind: workspace.workspaceKind, projectId: workspace.projectId ?? null } });
  }
  const approval = await prisma.assistantApproval.create({ data: { userId, toolName, arguments: args, preview, expiresAt, conversationId, workspaceKind: workspace.workspaceKind, projectId: workspace.projectId ?? null } });
  return {
    ok: true,
    answer: `Em đã kiểm tra yêu cầu và chuẩn bị xong. Chưa ghi dữ liệu nào.\n\n${preview}\n\nAnh có thể bấm “Xác nhận thực hiện” hoặc nhắn “làm đi”; nếu không xác nhận, yêu cầu sẽ tự hết hạn sau 10 phút. Nếu đây là yêu cầu chấm công mới, preview chấm công cũ trong cùng phiên đã được đánh dấu thay thế để tránh xác nhận nhầm.`,
    steps: workflowSteps(toolName as ActionName, "preview"),
    approval: { id: approval.id, toolName, preview, expiresAt: expiresAt.toISOString(), workspaceKind: workspace.workspaceKind, ...(workspace.projectId ? { projectId: workspace.projectId } : {}) },
  };
}

async function validateWrite(action: ActionName, args: unknown, userId: string): Promise<{ args: unknown; preview: string } | { error: string }> {
  if (action === "save_payroll" || action === "save_bulk_payroll" || action === "bulk_upsert_attendance") {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN" && actor?.role !== "MANAGER") return { error: "Chỉ ADMIN/MANAGER được chuẩn bị thao tác chấm công hoặc sửa lương." };
  }
  if (["update_customer_profile", "delete_customer", "update_consultation_record", "create_payment_request", "approve_payment_request", "reject_payment_request", "pay_payment_request", "create_work_plan"].includes(action)) {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return { error: "Các thao tác hồ sơ, sổ tư vấn và chứng từ chỉ ADMIN mới được chuẩn bị và xác nhận." };
  }
  if (action === "update_customer_profile") {
    const parsed = customerUpdateArgs.safeParse(args);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin sửa hồ sơ khách chưa hợp lệ." };
    const found = await findCustomer(parsed.data.customerCode);
    if (!found.customer) return { error: found.choices.length ? `Có mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy hồ sơ khách." };
    const current = found.customer;
    const merged = {
      customerId: current.id,
      customerCode: current.code,
      fullName: parsed.data.fullName ?? current.fullName,
      phone: parsed.data.phone ?? "",
      gender: parsed.data.gender ?? current.gender ?? undefined,
      dob: parsed.data.dob ?? (current.dob ? current.dob.toISOString().slice(0, 10) : ""),
      source: parsed.data.source ?? current.source,
      sourceDetail: parsed.data.sourceDetail ?? current.sourceDetail ?? "",
      address: parsed.data.address ?? current.address ?? "",
      note: parsed.data.note ?? current.note ?? "",
      allergies: parsed.data.allergies ?? current.allergies ?? "",
      medicalHistory: parsed.data.medicalHistory ?? current.medicalHistory ?? "",
      contraindications: parsed.data.contraindications ?? current.contraindications ?? "",
      resolvedName: current.fullName,
    };
    const changed = Object.entries(parsed.data).filter(([key]) => key !== "customerCode" && parsed.data[key as keyof typeof parsed.data] !== undefined).map(([key]) => key).join(", ");
    return { args: merged, preview: `Sửa hồ sơ khách ${current.fullName} (${current.code}), các trường: ${changed}. Số điện thoại nếu có đổi sẽ được mã hóa và kiểm tra trùng; các thông tin y khoa vẫn ghi audit.` };
  }
  if (action === "delete_customer") {
    const parsed = customerLookupArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần mã hồ sơ khách chính xác để xóa." };
    const found = await findCustomer(parsed.data.customerCode);
    if (!found.customer) return { error: found.choices.length ? `Có mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy hồ sơ khách." };
    const [caseCount, appointmentCount, paymentCount] = await Promise.all([
      prisma.caseRecord.count({ where: { customerId: found.customer.id } }),
      prisma.appointment.count({ where: { customerId: found.customer.id } }),
      prisma.payment.count({ where: { case: { customerId: found.customer.id } } }),
    ]);
    return { args: { customerId: found.customer.id, customerCode: found.customer.code, resolvedName: found.customer.fullName }, preview: `XÓA VĨNH VIỄN hồ sơ ${found.customer.fullName} (${found.customer.code}), gồm ${caseCount} hồ sơ điều trị, ${paymentCount} khoản thanh toán và ${appointmentCount} lịch hẹn. Hệ thống sẽ hoàn kho vật tư trước khi xóa; không thể hoàn tác bằng nút thông thường.` };
  }
  if (action === "update_consultation_record") {
    const parsed = consultationArgs.safeParse(args);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin sổ tư vấn chưa hợp lệ." };
    const found = await findCase(parsed.data.caseCode);
    if (!found.record) return { error: found.choices.length ? `Có mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy hồ sơ điều trị." };
    const existing = await prisma.consultationRecord.findUnique({ where: { caseId: found.record.id } });
    const merged = {
      caseId: found.record.id,
      caseCode: found.record.code,
      weightKg: parsed.data.weightKg ?? (existing?.weightKg == null ? undefined : Number(existing.weightKg)), heightCm: parsed.data.heightCm ?? (existing?.heightCm == null ? undefined : Number(existing.heightCm)),
      bloodType: parsed.data.bloodType ?? existing?.bloodType ?? "", emergencyName: parsed.data.emergencyName ?? existing?.emergencyName ?? "", emergencyPhone: parsed.data.emergencyPhone ?? existing?.emergencyPhone ?? "",
      pulse: parsed.data.pulse ?? existing?.pulse ?? undefined, bloodPressure: parsed.data.bloodPressure ?? existing?.bloodPressure ?? "", temperatureC: parsed.data.temperatureC ?? (existing?.temperatureC == null ? undefined : Number(existing.temperatureC)), respiratoryRate: parsed.data.respiratoryRate ?? existing?.respiratoryRate ?? undefined, spo2: parsed.data.spo2 ?? existing?.spo2 ?? undefined,
      screeningJson: parsed.data.screeningJson ?? JSON.stringify(existing?.screening ?? {}), patientConfirmed: parsed.data.patientConfirmed ?? existing?.patientConfirmed ?? false,
      wants: parsed.data.wants ?? existing?.wants ?? "", currentCondition: parsed.data.currentCondition ?? existing?.currentCondition ?? "", expectedResult: parsed.data.expectedResult ?? existing?.expectedResult ?? "", doctorIndication: parsed.data.doctorIndication ?? existing?.doctorIndication ?? "",
    };
    const late = !!existing && Date.now() - existing.updatedAt.getTime() > 24 * 60 * 60 * 1000;
    return { args: merged, preview: `Cập nhật Sổ tư vấn hồ sơ ${found.record.code} (${found.record.customer.fullName}), giữ nguyên các trường không nêu. ${late ? "Bản ghi đã quá 24 giờ nên bắt buộc ADMIN sửa; audit sẽ ghi rõ sửa muộn." : "Bản ghi còn trong thời hạn 24 giờ hoặc sẽ tạo mới."}` };
  }
  if (action === "create_payment_request") {
    const parsed = createPaymentRequestArgs.safeParse(args);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin Đề nghị thanh toán chưa hợp lệ." };
    if (parsed.data.month && await isMonthClosed(parsed.data.month)) return { error: `Tháng ${parsed.data.month} đã chốt sổ; không thể tạo chứng từ mới.` };
    return { args: parsed.data, preview: `Lập Đề nghị thanh toán PENDING cho ${parsed.data.payeeName}: ${formatVND(parsed.data.amount)} — ${parsed.data.reason}. Chứng từ chưa tạo dòng chi cho đến khi ADMIN duyệt và ghi sổ đã thanh toán.` };
  }
  if (action === "approve_payment_request" || action === "reject_payment_request" || action === "pay_payment_request") {
    const parsed = action === "reject_payment_request" ? rejectPaymentArgs.safeParse(args) : action === "pay_payment_request" ? payPaymentArgs.safeParse(args) : paymentRequestArgs.safeParse(args);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chứng từ chưa hợp lệ." };
    const requestNo = parsed.data.requestNo;
    const request = await prisma.paymentRequest.findUnique({ where: { requestNo }, select: { id: true, requestNo: true, status: true, payeeName: true, amount: true, reason: true, month: true } });
    if (!request) return { error: `Không tìm thấy Đề nghị thanh toán ${requestNo}.` };
    if (action === "approve_payment_request" && request.status !== "PENDING") return { error: `Chứng từ ${requestNo} không còn ở trạng thái chờ duyệt.` };
    if (action === "reject_payment_request" && request.status !== "PENDING") return { error: `Chứng từ ${requestNo} không còn ở trạng thái chờ duyệt.` };
    if (action === "pay_payment_request" && request.status !== "APPROVED") return { error: `Chứng từ ${requestNo} phải được ADMIN duyệt trước khi ghi sổ thanh toán.` };
    return { args: { ...parsed.data, requestId: request.id }, preview: `${action === "approve_payment_request" ? "Duyệt" : action === "reject_payment_request" ? "Từ chối" : "Ghi sổ đã thanh toán"} chứng từ ${request.requestNo}: ${request.payeeName} — ${formatVND(Number(request.amount))} — ${request.reason}${action === "reject_payment_request" ? `; lý do: ${(parsed.data as z.infer<typeof rejectPaymentArgs>).reason}` : ""}.` };
  }
  if (action === "bulk_upsert_attendance") {
    const parsed = attendanceArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần đủ tên nhân sự, danh sách ngày và giờ vào/ra để chấm công." };
    const found = await findStaff(parsed.data.staffName);
    if (!found.user) return { error: found.choices.length ? `Có nhiều tên gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy nhân sự đó." };
    const uniqueDates = [...new Set(parsed.data.dates)].sort();
    return {
      args: { ...parsed.data, dates: uniqueDates, userId: found.user.id, resolvedName: found.user.fullName },
      preview: `Chấm công ${found.user.fullName} đủ ${uniqueDates.length} ngày (${uniqueDates[0]} đến ${uniqueDates[uniqueDates.length - 1]}), giờ vào ${parsed.data.checkIn}, giờ ra ${parsed.data.checkOut ?? "chưa nhập"}. Nếu ngày đã có dữ liệu, hệ thống sẽ cập nhật theo lệnh mới; không tạo bản ghi trùng.`,
    };
  }
  if (action === "save_payroll") {
    const parsed = savePayrollArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần đủ tên nhân sự, tháng, hoa hồng, thưởng và điều chỉnh." };
    const found = await findStaff(parsed.data.staffName);
    if (!found.user) return { error: found.choices.length ? `Có nhiều tên gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy nhân sự đó." };
    if (await isMonthClosed(parsed.data.month)) return { error: `Tháng ${parsed.data.month} đã chốt sổ, không thể sửa.` };
    const payroll = await getPayroll(new Date(`${parsed.data.month}-01T00:00:00`));
    const current = payroll.rows.find((r) => r.id === found.user!.id);
    const baseSalary = parsed.data.baseSalary ?? current?.baseFull ?? 0;
    return { args: { ...parsed.data, userId: found.user.id, baseSalary }, preview: `Sửa lương ${found.user.fullName} tháng ${parsed.data.month}: lương cứng ${formatVND(baseSalary)}, điều chỉnh hoa hồng ngoài công thức ${formatVND(parsed.data.commissionOverride)}, thưởng ${formatVND(parsed.data.bonus)}, điều chỉnh ${formatVND(parsed.data.adjustment)}.` };
  }
  if (action === "save_bulk_payroll") {
    const parsed = bulkPayrollArgs.safeParse(args);
    if (!parsed.success) return { error: "Danh sách lương hàng loạt không hợp lệ." };
    if (await isMonthClosed(parsed.data.month)) return { error: `Tháng ${parsed.data.month} đã chốt sổ, không thể sửa.` };
    const resolved = [];
    for (const row of parsed.data.rows) {
      const found = await findStaff(row.staffName);
      if (!found.user) return { error: found.choices.length ? `Tên nhân sự không rõ: ${row.staffName}.` : `Không tìm thấy nhân sự: ${row.staffName}.` };
      resolved.push({ ...row, userId: found.user.id, resolvedName: found.user.fullName });
    }
    return { args: { month: parsed.data.month, rows: resolved }, preview: `Sửa hoa hồng/thưởng/điều chỉnh cho ${resolved.length} nhân sự trong tháng ${parsed.data.month}: ${resolved.map((r) => r.resolvedName).join(", ")}.` };
  }
  if (action === "record_payment") {
    const parsed = paymentArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần đủ mã hồ sơ, số tiền và hình thức thanh toán." };
    const found = await findCase(parsed.data.caseCode);
    if (!found.record) return { error: found.choices.length ? `Có nhiều mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy mã hồ sơ." };
    const current = getCaseFinancialTotal(found.record);
    if (parsed.data.amount > current.debt) return { error: `Số tiền ${formatVND(parsed.data.amount)} vượt công nợ còn lại ${formatVND(current.debt)}.` };
    return { args: { ...parsed.data, caseId: found.record.id }, preview: `Ghi nhận ${formatVND(parsed.data.amount)} cho hồ sơ ${found.record.code} của khách ${found.record.customer.fullName}; hình thức ${parsed.data.method}. Công nợ trước thu ${formatVND(current.debt)}.` };
  }
  if (action === "create_follow_up") {
    const parsed = followUpArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần đủ mã hồ sơ và thời gian follow-up." };
    const found = await findCase(parsed.data.caseCode);
    if (!found.record) return { error: found.choices.length ? `Có mã hồ sơ gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy mã hồ sơ." };
    const when = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) return { error: "Thời gian follow-up không hợp lệ hoặc đã ở quá khứ." };
    return { args: { ...parsed.data, caseId: found.record.id, customerId: found.record.customerId }, preview: `Tạo follow-up cho ${found.record.customer.fullName} — hồ sơ ${found.record.code} vào ${when.toLocaleString("vi-VN")}.` };
  }
  if (action === "create_appointment") {
    const parsed = appointmentArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần đủ tên khách, thời gian, loại lịch và nguồn khách." };
    const when = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) return { error: "Thời gian lịch hẹn không hợp lệ hoặc đã ở quá khứ." };
    let consultantId: string | null = null;
    let consultantDisplay = "chưa phân công";
    if (parsed.data.consultantName) {
      const found = await findStaff(parsed.data.consultantName);
      if (!found.user) return { error: found.choices.length ? `Có nhiều nhân sự gần giống: ${found.choices.join(", ")}.` : "Không tìm thấy người tư vấn." };
      consultantId = found.user.id;
      consultantDisplay = found.user.fullName;
    }
    return { args: { ...parsed.data, consultantId }, preview: `Tạo lịch ${parsed.data.type === "FOLLOW_UP" ? "tái khám" : "mới"} cho ${parsed.data.guestName} vào ${when.toLocaleString("vi-VN")}; dịch vụ ${parsed.data.serviceInterest ?? "chưa nêu"}; tư vấn viên ${consultantDisplay}.` };
  }
  if (action === "propose_system_change") {
    const parsed = changeArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần mô tả rõ cơ chế hoặc chức năng muốn thay đổi." };
    return { args: parsed.data, preview: `Tạo đề xuất thay đổi hệ thống để quản trị viên duyệt: ${parsed.data.request}` };
  }
  if (action === "create_work_plan") {
    const parsed = workPlanArgs.safeParse(args);
    if (!parsed.success) return { error: "Cần mục tiêu và ít nhất một nhiệm vụ cụ thể để lập kế hoạch." };
    const taskSummary = parsed.data.tasks.map((task, index) => `${index + 1}. ${task.title}${task.subtasks.length ? ` (${task.subtasks.length} việc phụ)` : ""}`).join("; ");
    return { args: parsed.data, preview: `Tạo kế hoạch “${parsed.data.goal}” gồm ${parsed.data.tasks.length} nhiệm vụ: ${taskSummary}. Kế hoạch sẽ lưu ở mục Kế hoạch và chưa thực hiện các nghiệp vụ dữ liệu khác.` };
  }
  return { error: "Thao tác này không cần xác nhận hoặc chưa được mở." };
}

async function persistAssistantResult(userId: string, conversationId: string, state: AgentState, workspace: AiWorkspaceContext) {
  const content = state.answer ?? state.error ?? "";
  if (content) {
    const metadata = { ...(state.approval ? { approval: state.approval } : {}), ...(state.steps ? { steps: state.steps } : {}), ...(state.clarification ? { clarification: state.clarification } : {}), ...(state.clarificationDraft ? { clarificationDraft: state.clarificationDraft } : {}), workspaceKind: workspace.workspaceKind, ...(workspace.projectId ? { projectId: workspace.projectId } : {}) };
    await appendAssistantTurn(userId, conversationId, "ASSISTANT", content, metadata as Prisma.InputJsonValue);
  }
  return { ...state, conversationId };
}

export async function runAssistantAgent(_prev: AgentState, formData: FormData): Promise<AgentState> {
    const user = await requireCap("mod:tro-ly");
  const workspace = await resolveAiWorkspace(user, String(formData.get("projectId") ?? ""));
  if (!workspace) return planError("Workspace Dự án không tồn tại hoặc tài khoản không còn membership active.");
  const aiPrincipal = await getAiPrincipal(user, workspace);
  const question = String(formData.get("question") ?? "").trim();

  if (!question) return planError("Vui lòng nhập yêu cầu.");
  if (question.length > 1200) return planError("Yêu cầu quá dài (tối đa 1.200 ký tự).");
  const conversation = await getOrCreateAssistantConversation(user.id, String(formData.get("conversationId") ?? "") || null);
  const conversationContext = await getAssistantConversationContext(user.id, conversation.id);
  const history = conversationContext.prompt;
  const userTurnCount = conversationContext.turns.filter((turn) => turn.role === "USER").length + 1;
  const shouldCompact = userTurnCount >= 8 && userTurnCount % 6 === 0;
  await appendAssistantTurn(user.id, conversation.id, "USER", question, { workspaceKind: workspace.workspaceKind, ...(workspace.projectId ? { projectId: workspace.projectId } : {}) });
  const finish = async (state: AgentState) => {
    const persisted = await persistAssistantResult(user.id, conversation.id, state, workspace);
    if (shouldCompact) await maybeCompactAssistantConversation(user.id, conversation.id).catch(() => undefined);
    return persisted;
  };
  const activePayload = findActiveClarificationPayload(conversationContext.turns);
  const selectedChoice = activePayload ? parseClarificationChoice(question) : null;
  if (activePayload && selectedChoice) {
    const draft = applyClarificationChoice(activePayload, selectedChoice);
    if (draft) return finish({ ok: true, answer: `Em đã ghi nhận lựa chọn ${selectedChoice} — ${draft.label}. ${draft.impact}\n\nĐây mới là bản nháp, chưa kích hoạt và chưa tính vào lương/thanh toán.\n\n${draft.nextQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`, clarificationDraft: draft, steps: ["Ghi nhận lựa chọn A/B/C/D", "Tạo draft config chưa kích hoạt", "Lưu evidence của lựa chọn người dùng"] });
  }
  const clarification = buildClarificationPayload(question);
  if (clarification) return finish({ ok: true, answer: clarificationAnswer(clarification), clarification, steps: ["Nhận diện yêu cầu thiếu dữ kiện", "Đưa ra bốn lựa chọn có tác động", "Chưa tạo hoặc kích hoạt cơ chế"] });

  if (!aiConfigured()) return finish(planError("Chưa cấu hình AI."));

  if (isBareApproval(question)) {
    const latest = await latestConversationApproval(user.id, conversation.id, workspace);
    if (!latest) return finish(planError("Hiện không có bản xem trước nào đang chờ xác nhận trong phiên này."));
    if (latest.status === "PENDING") {
      const fd = new FormData();
      fd.set("approvalId", latest.id);
      const result = await confirmAssistantApproval({}, fd);
      return result.error ? finish(result) : result;
    }
    const status = approvalStatusAnswer(latest);
    return finish({ ok: true, answer: status.answer, steps: status.steps });
  }

  if (isApprovalStatusQuestion(question)) {
    const latest = await latestConversationApproval(user.id, conversation.id, workspace);
    if (!latest) return finish({ ok: true, answer: "Em chưa thấy một thao tác nào trong phiên này để báo cáo. Anh gửi yêu cầu cụ thể, em sẽ phân tích và báo rõ: đã làm, đang chờ anh xác nhận, hay chưa thể làm." });
    const status = approvalStatusAnswer(latest);
    return finish({ ok: true, answer: status.answer, steps: status.steps });
  }

  const staffCandidates = workspace.workspaceKind === "INTERNAL" ? await prisma.user.findMany({ where: { active: true }, select: { id: true, fullName: true } }) : [];
    const deterministicAttendance = inferAttendanceIntent(question, history, staffCandidates);
  if (deterministicAttendance) {
    const governanceError = governanceBlock(aiPrincipal, "bulk_upsert_attendance", deterministicAttendance, true);
    if (governanceError) return finish(planError(governanceError));
    const checked = await validateWrite("bulk_upsert_attendance", deterministicAttendance, user.id);

    if ("error" in checked) return finish(planError(checked.error));
    const approval = await createApproval(user.id, "bulk_upsert_attendance", checked.args as Prisma.InputJsonValue, checked.preview, conversation.id, workspace);
    return finish(approval);
  }

  const planned = await generateStructured<PlannerOutput>({
    system: ASSISTANT_PLANNER_SYSTEM,
    prompt: await buildPlannerPrompt(question, user.id, user.role, history, workspace),
    schemaName: "zenith_agent_plan",
    schema: plannerSchema,
    maxTokens: 1400,
  });
  if (!planned.ok) return finish({ error: planned.error });
  const action = planned.data.action;
  if (!actionNames.includes(action)) return finish(planError("AI trả về công cụ không được phép."));

  const plannedSteps = planned.data.steps ?? [];
  if (plannedSteps.length > 4) return finish(planError("Kế hoạch đọc có quá 4 bước; em dừng lại để tránh chạy lan ngoài phạm vi yêu cầu."));
  if (plannedSteps.length > 0) {
    const unsafeStep = plannedSteps.find((step) => !READ_ACTIONS.has(step.action));
    if (unsafeStep) return finish(planError("Yêu cầu nhiều bước có thao tác ghi/xóa. Để bảo đảm approval và audit, em cần tách thành từng thao tác ghi riêng hoặc tạo một preview bulk rõ phạm vi."));

    const verifiedResults: string[] = [];
    const stepLabels: string[] = ["Phân rã yêu cầu thành các bước đọc độc lập"];
    for (const [index, step] of plannedSteps.entries()) {
            const args = jsonArgs(step.arguments_json);
      if (args === null) return finish(planError(`Tham số của bước ${index + 1} chưa hợp lệ; em chưa chạy bước nào tiếp theo.`));
      const governanceError = governanceBlock(aiPrincipal, step.action, args, step.requires_confirmation);
      if (governanceError) return finish(planError(governanceError));
      const result = await readAction(step.action, args, user.id, workspace);

      await audit(user.id, "ASSISTANT_READ_TOOL", { entity: step.action, meta: { ok: result.ok, step: index + 1, note: step.note ?? null } });
      stepLabels.push(`Bước ${index + 1}: đọc ${step.action}`);
      if (result.error) return finish({ error: result.error, steps: stepLabels });
      if (result.answer) verifiedResults.push(`Bước ${index + 1} — ${step.action}:\n${result.answer}`);
    }
    const answer = await buildFinalKnowledgeAnswer(question, user.role, planned.data.reply, verifiedResults);
    return finish({ ok: true, answer, steps: [...stepLabels, "Đối chiếu và hợp nhất các kết quả đã kiểm chứng"] });
  }

  if (action === "none") {
    const answer = await buildFinalKnowledgeAnswer(question, user.role, planned.data.reply, []);
    return finish({ ok: true, answer: `${answer}\n\nEm chưa thực hiện thay đổi nào trong yêu cầu này.`, steps: workflowSteps("none") });
  }

  const args = jsonArgs(planned.data.arguments_json);
  if (args === null) return finish(planError("Tôi chưa đọc được tham số yêu cầu. Anh hãy nói rõ tên, tháng hoặc số tiền."));
    if (READ_ACTIONS.has(action)) {
    const governanceError = governanceBlock(aiPrincipal, action, args, planned.data.requires_confirmation);
    if (governanceError) return finish(planError(governanceError));
    const policy = evaluateDispatcherAction(aiPrincipal, action, args);
    if (policy.confirmationRequired) {
      if (!planned.data.requires_confirmation) return finish(planError(`${governanceMessage(policy)} Em đã tạo cảnh báo; anh cần xác nhận rõ ràng trước khi đọc dữ liệu.`));
      const approval = await createApproval(user.id, action, args as Prisma.InputJsonValue, `${governanceMessage(policy)} Chỉ đọc trong phạm vi đã nêu; chưa hiển thị dữ liệu trước khi xác nhận.`, conversation.id, workspace);
      return finish(approval);
    }
    const result = await readAction(action, args, user.id, workspace);

    await audit(user.id, "ASSISTANT_READ_TOOL", { entity: action, meta: { ok: result.ok } });
    const answer = result.answer
      ? await buildFinalKnowledgeAnswer(question, user.role, planned.data.reply, [result.answer])
      : planned.data.reply;
    return finish({ ...result, answer, steps: workflowSteps(action, "read") });
  }

    const workspaceActionError = getAiWorkspaceActionError(workspace, action);
  if (workspaceActionError) return finish(planError(workspaceActionError));
  const governanceError = governanceBlock(aiPrincipal, action, args, planned.data.requires_confirmation);
  if (governanceError) return finish(planError(governanceError));
  const checked = await validateWrite(action, args, user.id);
  if ("error" in checked) return finish(planError(checked.error));

  if (!planned.data.requires_confirmation) return finish(planError("Thao tác ghi dữ liệu luôn phải có xác nhận ADMIN."));
  const approval = await createApproval(user.id, action, checked.args as Prisma.InputJsonValue, checked.preview, conversation.id, workspace);
  return finish(approval);
}

export async function confirmAssistantApproval(_prev: AgentState, formData: FormData): Promise<AgentState> {
    const user = await requireCap("mod:tro-ly");
  if (user.role !== "ADMIN") return planError("Chỉ ADMIN được xác nhận thao tác thay đổi dữ liệu.");
  const id = String(formData.get("approvalId") ?? "");

  const approval = await prisma.assistantApproval.findFirst({ where: { id, userId: user.id, status: "PENDING" } });
  if (!approval) return planError("Yêu cầu không tồn tại hoặc đã được xử lý.");
  const workspace: AiWorkspaceContext = { workspaceKind: approval.workspaceKind, ...(approval.projectId ? { projectId: approval.projectId } : {}) };
  const aiPrincipal = await getAiPrincipal(user, workspace);
  if (approval.expiresAt < new Date()) {
    await prisma.assistantApproval.update({ where: { id }, data: { status: "EXPIRED", resolvedAt: new Date() } });
    return planError("Yêu cầu đã hết hạn; hãy gửi lại yêu cầu để tạo bản xem trước mới.");
  }

    const args = approval.arguments as Record<string, unknown>;
  const governanceError = governanceBlock(aiPrincipal, approval.toolName, args, true, true);
  if (governanceError) return planError(governanceError);
  const workspaceActionError = getAiWorkspaceActionError(workspace, approval.toolName);
  if (workspaceActionError) return planError(workspaceActionError);
    try {
    let executionAnswer = approval.preview;
    if (READ_ACTIONS.has(approval.toolName as ActionName)) {
      const result = await readAction(approval.toolName as ActionName, args, user.id, workspace);
      if (result.error) return planError(result.error);
      executionAnswer = result.answer ?? approval.preview;
    } else if (approval.toolName === "bulk_upsert_attendance") {

      const fd = new FormData();
      fd.set("userId", String(args.userId));
      fd.set("dates", JSON.stringify(Array.isArray(args.dates) ? args.dates : []));
      fd.set("checkIn", String(args.checkIn));
      fd.set("checkOut", String(args.checkOut ?? ""));
      fd.set("note", String(args.note ?? ""));
      const result = await bulkUpsertAttendance({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "save_payroll") {
      const fd = new FormData();
      fd.set("id", String(args.userId));
      fd.set("month", String(args.month));
      fd.set("baseSalary", String(args.baseSalary));
      fd.set("commissionOverride", String(args.commissionOverride ?? 0));
      fd.set("bonus", String(args.bonus));
      fd.set("adjustment", String(args.adjustment));
      await savePayroll(fd);
    } else if (approval.toolName === "save_bulk_payroll") {
      const rows = Array.isArray(args.rows) ? args.rows : [];
      const fd = new FormData();
      fd.set("month", String(args.month));
      fd.set("rows", JSON.stringify(rows.map((r) => ({ id: r.userId, commissionOverride: r.commissionOverride ?? 0, bonus: r.bonus, adjustment: r.adjustment }))));
      const result = await saveBulkPayroll({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "record_payment") {
      const fd = new FormData();
      fd.set("caseId", String(args.caseId));
      // Approval ID là nonce ổn định: cùng một approval xác nhận lại không được tạo Payment thứ hai.
      fd.set("clientNonce", id);
      fd.set("amount", String(args.amount));
      fd.set("method", String(args.method));
      fd.set("note", String(args.note ?? ""));
      const result = await addPayment({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "create_follow_up") {
      const fd = new FormData();
      fd.set("caseId", String(args.caseId));
      fd.set("customerId", String(args.customerId));
      fd.set("scheduledAt", String(args.scheduledAt));
      fd.set("note", String(args.note ?? ""));
      const result = await addFollowUp({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "create_appointment") {
      const fd = new FormData();
      fd.set("guestName", String(args.guestName));
      fd.set("phoneLast5", String(args.phoneLast5 ?? ""));
      fd.set("scheduledAt", String(args.scheduledAt));
      fd.set("type", String(args.type));
      fd.set("serviceInterest", String(args.serviceInterest ?? ""));
      fd.set("source", String(args.source));
      fd.set("sourceDetail", String(args.sourceDetail ?? ""));
      fd.set("consultantId", String(args.consultantId ?? ""));
      fd.set("note", String(args.note ?? ""));
      const result = await createAppointment({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "update_customer_profile") {
      const fd = new FormData();
      fd.set("customerId", String(args.customerId));
      fd.set("fullName", String(args.fullName));
      fd.set("phone", String(args.phone ?? ""));
      fd.set("gender", String(args.gender ?? ""));
      fd.set("dob", String(args.dob ?? ""));
      fd.set("source", String(args.source ?? "OTHER"));
      fd.set("sourceDetail", String(args.sourceDetail ?? ""));
      fd.set("address", String(args.address ?? ""));
      fd.set("note", String(args.note ?? ""));
      fd.set("allergies", String(args.allergies ?? ""));
      fd.set("medicalHistory", String(args.medicalHistory ?? ""));
      fd.set("contraindications", String(args.contraindications ?? ""));
      const result = await updateCustomer({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "delete_customer") {
      await deleteCustomerForAgent(user.id, String(args.customerId));
    } else if (approval.toolName === "update_consultation_record") {
      const fd = new FormData();
      fd.set("caseId", String(args.caseId));
      for (const key of ["weightKg", "heightCm", "bloodType", "emergencyName", "emergencyPhone", "pulse", "bloodPressure", "temperatureC", "respiratoryRate", "spo2", "screeningJson", "wants", "currentCondition", "expectedResult", "doctorIndication"]) fd.set(key, String(args[key] ?? ""));
      fd.set("patientConfirmed", String(Boolean(args.patientConfirmed)));
      const result = await saveConsultationRecord({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "create_payment_request") {
      const fd = new FormData();
      fd.set("type", String(args.type));
      fd.set("payeeName", String(args.payeeName));
      fd.set("payeeUserId", String(args.payeeUserId ?? ""));
      fd.set("amount", String(args.amount));
      fd.set("reason", String(args.reason));
      fd.set("month", String(args.month ?? ""));
      fd.set("category", String(args.category ?? ""));
      fd.set("note", String(args.note ?? ""));
      const result = await createPaymentRequest({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "approve_payment_request") {
      const fd = new FormData();
      fd.set("id", String(args.requestId));
      const result = await approvePaymentRequest({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "reject_payment_request") {
      const fd = new FormData();
      fd.set("id", String(args.requestId));
      fd.set("reason", String(args.reason));
      const result = await rejectPaymentRequest({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "pay_payment_request") {
      const fd = new FormData();
      fd.set("id", String(args.requestId));
      fd.set("method", String(args.method));
      fd.set("occurredAt", String(args.occurredAt ?? new Date().toISOString()));
      const result = await markPaymentRequestPaid({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "create_work_plan") {
      const parsed = workPlanArgs.safeParse(args);
      if (!parsed.success) return planError("Kế hoạch đã lưu không còn hợp lệ; hãy lập lại từ đầu.");
      const plan = await prisma.plan.create({ data: { title: parsed.data.goal.slice(0, 120), note: `Kế hoạch do đồng nghiệp số lập từ yêu cầu ADMIN: ${parsed.data.goal}`, aiGenerated: true, createdById: user.id } });
      for (let index = 0; index < parsed.data.tasks.length; index += 1) {
        const task = parsed.data.tasks[index];
        const parent = await prisma.planTask.create({ data: { planId: plan.id, title: task.title, note: task.note, order: index } });
        for (let subIndex = 0; subIndex < task.subtasks.length; subIndex += 1) {
          const subtask = task.subtasks[subIndex];
          await prisma.planTask.create({ data: { planId: plan.id, parentId: parent.id, title: subtask.title, note: subtask.note, order: subIndex } });
        }
      }
      await auditRequired(prisma, user.id, "ASSISTANT_WORK_PLAN_CREATED", { entity: "Plan", entityId: plan.id, meta: { taskCount: parsed.data.tasks.length, source: "ASSISTANT_ADMIN_GATEWAY" } });
    } else if (approval.toolName === "propose_system_change") {
      const request = String(args.request);
      let plan = await prisma.plan.findFirst({ where: { title: "Yêu cầu từ Trợ lý AI" } });
      if (!plan) plan = await prisma.plan.create({ data: { title: "Yêu cầu từ Trợ lý AI", note: "Đề xuất do Agent lập, cần quản trị viên duyệt trước khi sửa code.", aiGenerated: true, createdById: user.id } });
      const max = await prisma.planTask.aggregate({ where: { planId: plan.id, parentId: null }, _max: { order: true } });
      const task = await prisma.planTask.create({ data: { planId: plan.id, title: request.slice(0, 120), note: request, order: (max._max.order ?? -1) + 1 } });
      const checklist = [
        ["Phân tích phạm vi", "Đọc schema, actions, UI, quyền và dữ liệu liên quan; chốt chính xác file cần đổi."],
        ["Soạn diff để ADMIN xem", "Tạo bản thay đổi có thể review, nêu rõ dữ liệu/migration và ảnh hưởng ngược."],
        ["Kiểm thử trước triển khai", "Chạy Prisma validate/generate, TypeScript, test hồi quy và production build."],
        ["Backup và migration", "Backup production trước; nếu có schema thì dùng migrate deploy, không reset/db push."],
        ["Triển khai và kiểm tra", "Recreate image, kiểm tra endpoint/role/luồng thực tế; nếu lỗi thì dừng và quay về backup phù hợp."],
      ] as const;
      for (let i = 0; i < checklist.length; i += 1) {
        await prisma.planTask.create({ data: { planId: plan.id, parentId: task.id, title: checklist[i][0], note: checklist[i][1], order: i } });
      }
      await auditRequired(prisma, user.id, "ASSISTANT_CHANGE_PROPOSAL", { entity: "PlanTask", entityId: task.id, meta: { planId: plan.id, checklist: checklist.map(([title]) => title) } });
    } else {
      return planError("Công cụ xác nhận không còn được hỗ trợ.");
    }
    await prisma.assistantApproval.update({ where: { id }, data: { status: "APPROVED", resolvedAt: new Date() } });
    await audit(user.id, "ASSISTANT_MUTATION_EXECUTED", { entity: approval.toolName, entityId: id, meta: { workspaceKind: workspace.workspaceKind, projectId: workspace.projectId ?? null } });
    const result: AgentState = { ok: true, answer: `Đã thực hiện xong. ${executionAnswer}`, steps: workflowSteps(approval.toolName as ActionName, "done") };
    if (approval.conversationId) {
      await appendAssistantTurn(user.id, approval.conversationId, "ASSISTANT", result.answer ?? "Đã thực hiện.", { approvalId: id, toolName: approval.toolName, status: "APPROVED", steps: result.steps ?? [], workspaceKind: workspace.workspaceKind, ...(workspace.projectId ? { projectId: workspace.projectId } : {}) });
      result.conversationId = approval.conversationId;
    }
    return result;
  } catch (error) {
    return planError(error instanceof Error ? error.message : "Thao tác thất bại; chưa thể xác nhận kết quả.");
  }
}

export async function rejectAssistantApproval(_prev: AgentState, formData: FormData): Promise<AgentState> {
  const user = await requireCap("mod:tro-ly");
  const id = String(formData.get("approvalId") ?? "");
  const approval = await prisma.assistantApproval.findFirst({ where: { id, userId: user.id, status: "PENDING" }, select: { conversationId: true, workspaceKind: true, projectId: true } });
  await prisma.assistantApproval.updateMany({ where: { id, userId: user.id, status: "PENDING" }, data: { status: "REJECTED", resolvedAt: new Date() } });
  await audit(user.id, "ASSISTANT_APPROVAL_REJECTED", { entity: "AssistantApproval", entityId: id, meta: { workspaceKind: approval?.workspaceKind ?? "INTERNAL", projectId: approval?.projectId ?? null } });
  const result: AgentState = { ok: true, answer: "Đã hủy thao tác. Không có dữ liệu nào bị thay đổi.", steps: ["Đối chiếu approval", "Hủy trước khi ghi dữ liệu", "Ghi audit kết quả hủy"] };
  if (approval?.conversationId) {
    await appendAssistantTurn(user.id, approval.conversationId, "ASSISTANT", result.answer ?? "Đã hủy thao tác.", { approvalId: id, status: "REJECTED", steps: result.steps ?? [], workspaceKind: approval.workspaceKind, ...(approval.projectId ? { projectId: approval.projectId } : {}) });
    result.conversationId = approval.conversationId;
  }
  return result;
}
