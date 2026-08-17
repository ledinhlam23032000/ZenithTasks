"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { aiConfigured, generateStructured } from "@/lib/ai";
import { getAssistantContext } from "@/lib/assistant-data";
import { formatAssistantContext } from "@/lib/assistant";
import { getPayroll } from "@/lib/payroll";
import { formatVND } from "@/lib/money";
import { isMonthClosed } from "@/lib/accounting";
import { audit, auditRequired } from "@/lib/audit";
import { savePayroll, saveBulkPayroll } from "../luong/actions";
import { addPayment, addFollowUp } from "../ho-so/actions";
import { createAppointment } from "../lich-hen/actions";
import { summarizeCase } from "@/lib/financial-summary";
import { getFinancialHealthIssues } from "@/lib/financial-health-db";
import type { Prisma } from "@/generated/prisma/client";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const actionNames = [
  "none",
  "get_business_summary",
  "get_payroll_row",
  "get_debt_summary",
  "get_lead_priorities",
  "get_financial_alerts",
  "prepare_payroll_export",
  "save_payroll",
  "save_bulk_payroll",
  "record_payment",
  "create_follow_up",
  "create_appointment",
  "propose_system_change",
] as const;

type ActionName = (typeof actionNames)[number];

type PlannerOutput = {
  reply: string;
  action: ActionName;
  arguments_json: string;
  requires_confirmation: boolean;
  preview: string;
};

export type AgentState = {
  ok?: boolean;
  answer?: string;
  error?: string;
  approval?: { id: string; toolName: string; preview: string; expiresAt: string };
  exportUrl?: string;
};

const plannerSchema = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Câu trả lời ngắn bằng tiếng Việt, nêu AI đã hiểu yêu cầu gì." },
    action: { type: "string", enum: actionNames },
    arguments_json: { type: "string", description: "JSON object chứa tham số của action; nếu none thì {}." },
    requires_confirmation: { type: "boolean" },
    preview: { type: "string", description: "Bản xem trước tác động; để trống nếu action là đọc." },
  },
  required: ["reply", "action", "arguments_json", "requires_confirmation", "preview"],
  additionalProperties: false,
};

const priorityArgs = z.object({ days: z.number().int().min(1).max(90).optional() });

const payrollReadArgs = z.object({
  staffName: z.string().min(1).max(120),
  month: monthSchema.optional(),
});
const payrollExportArgs = z.object({
  month: monthSchema,
  format: z.enum(["xlsx", "doc", "csv"]),
  standardDays: z.number().int().min(1).max(31).optional(),
});
const savePayrollArgs = z.object({
  staffName: z.string().min(1).max(120),
  month: monthSchema,
  baseSalary: z.number().int().min(0).optional(),
  commission: z.number().int().min(0),
  bonus: z.number().int().min(0),
  adjustment: z.number().int(),
});
const bulkRowArgs = z.object({
  staffName: z.string().min(1).max(120),
  commission: z.number().int().min(0),
  bonus: z.number().int().min(0),
  adjustment: z.number().int(),
});
const bulkPayrollArgs = z.object({ month: monthSchema, rows: z.array(bulkRowArgs).min(1).max(100) });
const paymentArgs = z.object({ caseCode: z.string().min(1).max(40), amount: z.number().int().positive(), method: z.enum(["CASH", "CARD", "TRANSFER", "EWALLET"]), note: z.string().max(500).optional() });
const followUpArgs = z.object({ caseCode: z.string().min(1).max(40), scheduledAt: z.string().min(10), note: z.string().max(500).optional() });
const appointmentArgs = z.object({ guestName: z.string().min(1).max(120), phoneLast5: z.string().regex(/^\d{5}$/).optional(), scheduledAt: z.string().min(10), type: z.enum(["NEW", "FOLLOW_UP", "RE_SERVICE"]), serviceInterest: z.string().max(200).optional(), source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]), sourceDetail: z.string().max(200).optional(), consultantName: z.string().max(120).optional(), note: z.string().max(500).optional() });
const changeArgs = z.object({ request: z.string().min(5).max(2000) });

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

const actionHelp = `
Công cụ được phép:
- get_business_summary: đọc tổng quan vận hành.
- get_payroll_row: xem bảng lương của một nhân sự theo tháng; args {staffName, month?}.
- get_debt_summary: đọc tổng công nợ hiện tại.
- get_lead_priorities: xếp khách đang tư vấn/cân nhắc theo khả năng cần gọi lại; args {days?}.
- get_financial_alerts: đọc các hồ sơ có dấu hiệu lệch tiền, trả vượt hoặc snapshot cũ.
- prepare_payroll_export: chuẩn bị link xuất bảng lương; args {month, format: xlsx|doc|csv, standardDays?}.
- save_payroll: sửa lương/hoa hồng/thưởng/điều chỉnh một nhân sự; args {staffName, month, baseSalary?, commission, bonus, adjustment}. Luôn cần ADMIN xác nhận.
- save_bulk_payroll: sửa nhiều nhân sự; args {month, rows:[{staffName, commission, bonus, adjustment}]}. Luôn cần ADMIN xác nhận.
- record_payment: ghi nhận khoản thu cho hồ sơ; args {caseCode, amount, method, note}. Luôn xem trước và xác nhận.
- create_follow_up: tạo lịch chăm sóc/tái khám; args {caseCode, scheduledAt, note}. Luôn xem trước và xác nhận.
- create_appointment: tạo lịch hẹn; args {guestName, phoneLast5?, scheduledAt, type, serviceInterest?, source, sourceDetail?, consultantName?, note?}. Luôn xem trước và xác nhận.
- propose_system_change: ghi đề xuất đổi cơ chế/code thành kế hoạch để duyệt; args {request}.
Không tự đoán tên người, tháng, số tiền; nếu thiếu thì action=none và hỏi lại. Không gọi tool khác, không viết SQL, không sửa file trực tiếp.`;

async function buildPlannerPrompt(question: string): Promise<string> {
  const context = await getAssistantContext();
  return `${actionHelp}\n\nBỐI CẢNH SỐ LIỆU HIỆN TẠI:\n${formatAssistantContext(context)}\n\nYÊU CẦU CỦA ADMIN:\n${question}\n\nChọn tối đa một action. Yêu cầu sửa/ghi dữ liệu phải đặt requires_confirmation=true. Nếu là yêu cầu đổi công thức hoặc code, dùng propose_system_change, không dùng save_payroll.`;
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
  return { error: message };
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

async function readAction(action: ActionName, args: unknown): Promise<AgentState> {
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
      answer: `Bảng lương ${found.user.fullName} — ${month}\n- Ngày công: ${row.daysWorked}/${payroll.standardDays}\n- Lương cứng thực nhận: ${formatVND(row.baseActual)}\n- Thực thu tư vấn: ${formatVND(row.collectedConsult.total)}\n- Thực thu bác sĩ: ${formatVND(row.collectedDoctor.total)}\n- Công nợ khách phụ trách: ${formatVND(row.debtOutstanding)}\n- Hoa hồng đã nhập: ${formatVND(row.commission)}\n- Thưởng/điều chỉnh: ${formatVND(row.bonus + row.adjustment)}\n- Tổng nhận: ${formatVND(row.total)}`,
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

async function createApproval(userId: string, toolName: string, args: Prisma.InputJsonValue, preview: string): Promise<AgentState> {
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const approval = await prisma.assistantApproval.create({ data: { userId, toolName, arguments: args, preview, expiresAt } });
  return { ok: true, answer: "Tôi đã chuẩn bị thao tác nhưng chưa thực hiện.", approval: { id: approval.id, toolName, preview, expiresAt: expiresAt.toISOString() } };
}

async function validateWrite(action: ActionName, args: unknown, userId: string): Promise<{ args: unknown; preview: string } | { error: string }> {
  if (action === "save_payroll" || action === "save_bulk_payroll") {
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (actor?.role !== "ADMIN") return { error: "Chỉ ADMIN được chuẩn bị thao tác sửa lương." };
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
    return { args: { ...parsed.data, userId: found.user.id, baseSalary }, preview: `Sửa lương ${found.user.fullName} tháng ${parsed.data.month}: lương cứng ${formatVND(baseSalary)}, hoa hồng ${formatVND(parsed.data.commission)}, thưởng ${formatVND(parsed.data.bonus)}, điều chỉnh ${formatVND(parsed.data.adjustment)}.` };
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
  return { error: "Thao tác này không cần xác nhận hoặc chưa được mở." };
}

export async function runAssistantAgent(_prev: AgentState, formData: FormData): Promise<AgentState> {
  const user = await requireCap("mod:tro-ly");
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return planError("Vui lòng nhập yêu cầu.");
  if (question.length > 1200) return planError("Yêu cầu quá dài (tối đa 1.200 ký tự).");
  if (!aiConfigured()) return planError("Chưa cấu hình AI.");

  const planned = await generateStructured<PlannerOutput>({
    system: "Bạn là Agent quản trị của ZenithTasks. Bạn không được tự ý sửa DB. Hãy chọn đúng một công cụ trong danh sách, không bịa ID/tên/tháng/số tiền, và dùng tiếng Việt.",
    prompt: await buildPlannerPrompt(question),
    schemaName: "zenith_agent_plan",
    schema: plannerSchema,
    maxTokens: 1200,
  });
  if (!planned.ok) return { error: planned.error };
  const action = planned.data.action;
  if (!actionNames.includes(action)) return planError("AI trả về công cụ không được phép.");
  const args = jsonArgs(planned.data.arguments_json);
  if (args === null) return planError("Tôi chưa đọc được tham số yêu cầu. Anh hãy nói rõ tên, tháng hoặc số tiền.");

  if (action === "none") {
    return { ok: true, answer: `${planned.data.reply}\n\nTôi chưa thực hiện thay đổi nào.` };
  }
  if (["get_business_summary", "get_debt_summary", "get_lead_priorities", "get_financial_alerts", "get_payroll_row", "prepare_payroll_export"].includes(action)) {
    const result = await readAction(action, args);
    await audit(user.id, "ASSISTANT_READ_TOOL", { entity: action, meta: { ok: result.ok } });
    return { ...result, answer: `${planned.data.reply}\n\n${result.answer ?? ""}` };
  }

  const checked = await validateWrite(action, args, user.id);
  if ("error" in checked) return planError(checked.error);
  if (!planned.data.requires_confirmation) return planError("Thao tác ghi dữ liệu luôn phải có xác nhận ADMIN.");
  return createApproval(user.id, action, checked.args as Prisma.InputJsonValue, checked.preview);
}

export async function confirmAssistantApproval(_prev: AgentState, formData: FormData): Promise<AgentState> {
  const user = await requireCap("mod:tro-ly");
  if (user.role !== "ADMIN") return planError("Chỉ ADMIN được xác nhận thao tác thay đổi dữ liệu.");
  const id = String(formData.get("approvalId") ?? "");
  const approval = await prisma.assistantApproval.findFirst({ where: { id, userId: user.id, status: "PENDING" } });
  if (!approval) return planError("Yêu cầu không tồn tại hoặc đã được xử lý.");
  if (approval.expiresAt < new Date()) {
    await prisma.assistantApproval.update({ where: { id }, data: { status: "EXPIRED", resolvedAt: new Date() } });
    return planError("Yêu cầu đã hết hạn; hãy gửi lại yêu cầu để tạo bản xem trước mới.");
  }

  const args = approval.arguments as Record<string, unknown>;
  try {
    if (approval.toolName === "save_payroll") {
      const fd = new FormData();
      fd.set("id", String(args.userId));
      fd.set("month", String(args.month));
      fd.set("baseSalary", String(args.baseSalary));
      fd.set("commission", String(args.commission));
      fd.set("bonus", String(args.bonus));
      fd.set("adjustment", String(args.adjustment));
      await savePayroll(fd);
    } else if (approval.toolName === "save_bulk_payroll") {
      const rows = Array.isArray(args.rows) ? args.rows : [];
      const fd = new FormData();
      fd.set("month", String(args.month));
      fd.set("rows", JSON.stringify(rows.map((r) => ({ id: r.userId, commission: r.commission, bonus: r.bonus, adjustment: r.adjustment }))));
      const result = await saveBulkPayroll({}, fd);
      if (result.error) return planError(result.error);
    } else if (approval.toolName === "record_payment") {
      const fd = new FormData();
      fd.set("caseId", String(args.caseId));
      fd.set("clientNonce", crypto.randomUUID());
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
    } else if (approval.toolName === "propose_system_change") {
      const request = String(args.request);
      let plan = await prisma.plan.findFirst({ where: { title: "Yêu cầu từ Trợ lý AI" } });
      if (!plan) plan = await prisma.plan.create({ data: { title: "Yêu cầu từ Trợ lý AI", note: "Đề xuất do Agent lập, cần quản trị viên duyệt trước khi sửa code.", aiGenerated: true, createdById: user.id } });
      const max = await prisma.planTask.aggregate({ where: { planId: plan.id, parentId: null }, _max: { order: true } });
      const task = await prisma.planTask.create({ data: { planId: plan.id, title: request.slice(0, 120), note: request, order: (max._max.order ?? -1) + 1 } });
      await auditRequired(prisma, user.id, "ASSISTANT_CHANGE_PROPOSAL", { entity: "PlanTask", entityId: task.id, meta: { planId: plan.id } });
    } else {
      return planError("Công cụ xác nhận không còn được hỗ trợ.");
    }
    await prisma.assistantApproval.update({ where: { id }, data: { status: "APPROVED", resolvedAt: new Date() } });
    await audit(user.id, "ASSISTANT_MUTATION_EXECUTED", { entity: approval.toolName, entityId: id });
    return { ok: true, answer: `Đã thực hiện: ${approval.preview}` };
  } catch (error) {
    return planError(error instanceof Error ? error.message : "Thao tác thất bại; chưa thể xác nhận kết quả.");
  }
}

export async function rejectAssistantApproval(_prev: AgentState, formData: FormData): Promise<AgentState> {
  const user = await requireCap("mod:tro-ly");
  const id = String(formData.get("approvalId") ?? "");
  await prisma.assistantApproval.updateMany({ where: { id, userId: user.id, status: "PENDING" }, data: { status: "REJECTED", resolvedAt: new Date() } });
  await audit(user.id, "ASSISTANT_APPROVAL_REJECTED", { entity: "AssistantApproval", entityId: id });
  return { ok: true, answer: "Đã hủy thao tác. Không có dữ liệu nào bị thay đổi." };
}
