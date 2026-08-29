import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { enforceRuntimeAiTool, resolveRuntimeAiAgent } from "./v2-ai-agent-runtime";
import { nextAiJobStatus, type AiJobStatus } from "./v2-ai-job-contract";
import { evaluateAiToolRequest, type AiWorkspaceContext, type AiPrincipal } from "./ai-governance";

const JOB_TIMEOUT_MARKER = "JOB_TIMEOUT_EXCEEDED";

/**
 * Action nào GHI dữ liệu thật — phải khớp CHÍNH XÁC với các nhánh ghi trong
 * dispatchJobTool. Đây là nguồn sự thật duy nhất cho "action này có ghi
 * không", KHÔNG suy đoán từ tên hay để evaluateAiToolRequest tự đoán.
 *
 * Vì sao cần: evaluateAiToolRequest (ai-governance.ts) chỉ xếp risk cao (L4/L5,
 * bắt buộc qua approval) khi CALLER tự truyền `irreversible: true` hoặc
 * `amount > 0`. executeAiJobRunner trước đây gọi hàm này mà KHÔNG truyền hai
 * field đó cho bất kỳ action nào — nên mọi write tool (kể cả
 * create_customer_profile, đang ghi thẳng ZWorkspaceCustomer thật) rơi vào
 * nhánh mặc định cuối cùng "WARN/L3 — AI đang tạo bản nháp", tức là CHẠY THẲNG
 * không qua approval dù đang ghi dữ liệu thật. Danh sách này chặn đúng gốc.
 */
const WRITE_ACTIONS = new Set(["create_customer_profile", "create_workspace_task", "suspend_child_agent", "resume_child_agent"]);

function writeIrreversibility(action: string): { irreversible?: boolean; amount?: number } {
  return WRITE_ACTIONS.has(action) ? { irreversible: true } : {};
}

export type VerifyResult = { ok: boolean; notes: string[] };

/**
 * MC-20: bước Verify RIÊNG BIỆT giữa Execute và Audit, đúng chuỗi
 * Plan->Preview->Approve->Execute->Verify->Audit owner yêu cầu — trước đây
 * dispatchJobTool trả về không throw là coi như thành công thẳng, KHÔNG có
 * bước nào đọc lại DB để xác nhận trạng thái thật khớp với điều tool vừa
 * TUYÊN BỐ đã làm. Với action GHI dữ liệu, verify đọc lại đúng bản ghi vừa
 * tạo/sửa — không tin resultMeta một chiều. Với action đọc/draft (không đổi
 * state), verify là no-op có ghi chú rõ ràng — KHÔNG bỏ qua bước, chỉ là
 * không có gì để xác minh lại.
 */
export async function verifyJobExecution(action: string, resultMeta: Record<string, unknown>): Promise<VerifyResult> {
  if (action === "create_customer_profile") {
    const created = resultMeta.createdCustomer as { id?: string; fullName?: string } | undefined;
    if (!created?.id) return { ok: false, notes: ["resultMeta thiếu id khách hàng vừa tạo"] };
    const row = await prisma.zWorkspaceCustomer.findUnique({ where: { id: created.id }, select: { active: true, fullName: true } });
    if (!row || !row.active) return { ok: false, notes: [`không tìm thấy khách hàng active id=${created.id} trong DB sau khi tạo`] };
    if (row.fullName !== created.fullName) return { ok: false, notes: ["fullName trong DB không khớp resultMeta đã trả về"] };
    return { ok: true, notes: [`đã đọc lại khách hàng id=${created.id} trong DB, active=true, khớp resultMeta`] };
  }
  if (action === "create_workspace_task") {
    const created = resultMeta.createdTask as { id?: string; title?: string } | undefined;
    if (!created?.id) return { ok: false, notes: ["resultMeta thiếu id công việc vừa tạo"] };
    const row = await prisma.zWorkspaceTask.findUnique({ where: { id: created.id }, select: { title: true } });
    if (!row) return { ok: false, notes: [`không tìm thấy công việc id=${created.id} trong DB sau khi tạo`] };
    if (row.title !== created.title) return { ok: false, notes: ["title trong DB không khớp resultMeta đã trả về"] };
    return { ok: true, notes: [`đã đọc lại công việc id=${created.id} trong DB, khớp resultMeta`] };
  }
  if (action === "suspend_child_agent") {
    const agentId = resultMeta.suspendedAgentId as string | undefined;
    if (!agentId) return { ok: false, notes: ["resultMeta thiếu suspendedAgentId"] };
    const row = await prisma.zAiAgent.findUnique({ where: { id: agentId }, select: { status: true } });
    if (row?.status !== "SUSPENDED") return { ok: false, notes: [`agent ${agentId} thực tế đang status=${row?.status ?? "KHÔNG TÌM THẤY"}, không phải SUSPENDED`] };
    return { ok: true, notes: [`đã đọc lại agent ${agentId} trong DB, status=SUSPENDED đúng như đã tuyên bố`] };
  }
  if (action === "resume_child_agent") {
    const agentId = resultMeta.resumedAgentId as string | undefined;
    if (!agentId) return { ok: false, notes: ["resultMeta thiếu resumedAgentId"] };
    const row = await prisma.zAiAgent.findUnique({ where: { id: agentId }, select: { status: true } });
    if (row?.status !== "ACTIVE") return { ok: false, notes: [`agent ${agentId} thực tế đang status=${row?.status ?? "KHÔNG TÌM THẤY"}, không phải ACTIVE`] };
    return { ok: true, notes: [`đã đọc lại agent ${agentId} trong DB, status=ACTIVE đúng như đã tuyên bố`] };
  }
  return { ok: true, notes: ["action đọc dữ liệu hoặc chỉ tạo bản nháp (không đổi state) — không có gì để xác minh lại"] };
}

export type AiJobExecutionResult = {
  ok: boolean;
  jobId: string;
  status: AiJobStatus;
  attempt: number;
  resultMeta?: Record<string, unknown>;
  error?: string;
};

export async function dispatchJobTool(
  toolName: string,
  action: string,
  targetProjectId: string | null,
  args: Record<string, unknown>,
  actor: { id: string; role: string }
): Promise<Record<string, unknown>> {
  // ---- AI Tổng quản lý AI con: xem trạng thái + tạm dừng khi phát hiện bất
  // thường (vd agent lỗi liên tục, chi phí bất thường). KHÔNG có action nào
  // cho AI Tổng tự ACTIVATE AI con — kích hoạt vẫn phải qua con người xác nhận
  // company sẵn sàng vận hành (đúng nguyên tắc "reversible-first": tạm dừng dễ
  // hoàn tác, kích hoạt cho phép AI con hành động thật nên cần người quyết).
  if (action === "get_child_agent_status") {
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    const agents = await prisma.zAiAgent.findMany({
      where: { kind: "CHILD" },
      select: { id: true, code: true, name: true, status: true, projectId: true, lastHeartbeatAt: true, project: { select: { code: true, name: true, status: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return { childAgents: agents, total: agents.length };
  }

  // MC-23: tính năng AI CHỦ ĐỘNG — AI Tổng quét công nợ TOÀN BỘ company trong
  // 1 lần gọi thay vì phải hỏi từng company riêng lẻ, tự đánh dấu công ty nào
  // vượt ngưỡng cần chú ý (ngưỡng mặc định 5tr, khớp `getDebtThreshold()` mặc
  // định của clinic legacy — không bịa số mới). Đây là bước đầu hướng tới AI
  // tự phát hiện vấn đề thay vì chỉ phản ứng khi được giao job.
  if (action === "get_ecosystem_debt_alert") {
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    const DEBT_ALERT_THRESHOLD = 5_000_000;
    const projects = await prisma.zProject.findMany({ where: { status: "ACTIVE" }, select: { id: true, code: true, name: true } });
    const perProject = await Promise.all(projects.map(async (p) => {
      const sales = await prisma.zWorkspaceSale.findMany({ where: { projectId: p.id, status: { in: ["CONFIRMED", "PAID"] } }, select: { amount: true, paidAmount: true } });
      const debts = sales.map((s) => Math.max(0, Number(s.amount) - Number(s.paidAmount))).filter((d) => d > 0);
      return { projectId: p.id, projectCode: p.code, projectName: p.name, totalDebt: debts.reduce((a, b) => a + b, 0), overdueSalesCount: debts.length };
    }));
    const withDebt = perProject.filter((r) => r.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt);
    const alerts = withDebt.filter((r) => r.totalDebt >= DEBT_ALERT_THRESHOLD);
    return { threshold: DEBT_ALERT_THRESHOLD, alertCount: alerts.length, alerts, companies: withDebt.slice(0, 20) };
  }

  if (action === "suspend_child_agent") {
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    const { SuspendChildAgentSchema } = await import("./v2-ai-tool-schemas");
    const parsed = SuspendChildAgentSchema.parse(args);
    const result = await prisma.zAiAgent.updateMany({
      where: { id: parsed.agentId, kind: "CHILD", status: "ACTIVE" },
      data: { status: "SUSPENDED" },
    });
    if (result.count !== 1) throw new Error("AGENT_NOT_FOUND_OR_NOT_ACTIVE");
    return { suspendedAgentId: parsed.agentId, reason: parsed.reason };
  }

  // MC-19: đối xứng với suspend — AI Tổng trước đây chỉ tạm dừng được AI con,
  // không có cách kích hoạt lại (phải vào tay sửa DB/UI). Resume vẫn là hành
  // động GHI có hậu quả thật (AI con lại được phép hành động) nên nằm trong
  // WRITE_ACTIONS, qua đúng approval gate như suspend.
  if (action === "resume_child_agent") {
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    const { ResumeChildAgentSchema } = await import("./v2-ai-tool-schemas");
    const parsed = ResumeChildAgentSchema.parse(args);
    const result = await prisma.zAiAgent.updateMany({
      where: { id: parsed.agentId, kind: "CHILD", status: "SUSPENDED" },
      data: { status: "ACTIVE", lastHeartbeatAt: new Date() },
    });
    if (result.count !== 1) throw new Error("AGENT_NOT_FOUND_OR_NOT_SUSPENDED");
    return { resumedAgentId: parsed.agentId, reason: parsed.reason };
  }

  // MC-19: AI Tổng trước đây chỉ biết status hiện tại của AI con
  // (get_child_agent_status), không xem được nó ĐÃ LÀM GÌ — không thể phát
  // hiện agent lỗi liên tục/lặp action bất thường để quyết định có nên suspend
  // hay không. Chỉ đọc, không cần role check thêm ngoài policy GLOBAL chung.
  if (action === "get_child_agent_jobs") {
    if (actor.role !== "ADMIN") throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    const { GetChildAgentJobsSchema } = await import("./v2-ai-tool-schemas");
    const parsed = GetChildAgentJobsSchema.parse(args);
    const agent = await prisma.zAiAgent.findFirst({ where: { id: parsed.agentId, kind: "CHILD" }, select: { id: true, code: true, name: true } });
    if (!agent) throw new Error("AGENT_NOT_FOUND");
    const jobs = await prisma.zAiJob.findMany({
      where: { targetAgentId: parsed.agentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, status: true, attempt: true, createdAt: true, startedAt: true, finishedAt: true, lastError: true },
    });
    return { agent, jobs, total: jobs.length };
  }

  if (action === "get_workspace_overview") {
    if (actor.role !== "ADMIN") {
      throw new Error("FORBIDDEN_GLOBAL_OVERVIEW");
    }
    const [projectCount, activeProjects, totalTasks, totalAgents] = await Promise.all([
      prisma.zProject.count(),
      prisma.zProject.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, name: true, projectType: true, status: true },
        take: 50,
      }),
      prisma.zWorkspaceTask.count({ where: { project: { status: "ACTIVE" } } }),
      prisma.zAiAgent.count({ where: { status: "ACTIVE" } }),
    ]);
    return {
      overview: {
        totalProjects: projectCount,
        activeProjectsCount: activeProjects.length,
        totalActiveTasks: totalTasks,
        totalActiveAgents: totalAgents,
        sampleProjects: activeProjects,
      },
    };
  }

  if (action === "read_project_overview" || action === "get_project_overview") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const project = await prisma.zProject.findUnique({
      where: { id: targetProjectId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        _count: {
          select: {
            workspaceTasks: true,
            workspaceCustomers: true,
            workspaceAppointments: true,
            workspaceSales: true,
            members: true,
          },
        },
      },
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    return { projectOverview: project };
  }

  if (action === "get_project_tasks") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const tasks = await prisma.zWorkspaceTask.findMany({
      where: { projectId: targetProjectId },
      select: { id: true, title: true, status: true, priority: true, dueAt: true, order: true },
      orderBy: [{ status: "asc" }, { order: "asc" }],
      take: 100,
    });
    return { tasks, total: tasks.length };
  }

  if (action === "get_project_customers") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const customers = await prisma.zWorkspaceCustomer.findMany({
      where: { projectId: targetProjectId, active: true },
      select: { id: true, code: true, fullName: true, phoneLast4: true, source: true, consentStatus: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { customers, total: customers.length };
  }

  // MC-23: v2-project-actions.ts (tạo company mới) đã cấp sẵn tool này trong
  // toolAllowlist mặc định của AI con từ trước, nhưng dispatchJobTool chưa
  // từng hỗ trợ action này — nghĩa là AI con "tưởng có" quyền đọc doanh số
  // nhưng gọi thật sẽ luôn UNSUPPORTED_JOB_TOOL_ACTION. Vá đúng chỗ hứa hẹn
  // sai này, dùng cùng logic/format đã có ở bridge legacy (tro-ly/agent.ts).
  if (action === "get_project_sales_summary") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const sales = await prisma.zWorkspaceSale.findMany({
      where: { projectId: targetProjectId },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: { code: true, serviceName: true, amount: true, paidAmount: true, status: true, occurredAt: true },
    });
    const totalAmount = sales.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalPaid = sales.reduce((sum, s) => sum + Number(s.paidAmount), 0);
    return { totalAmount, totalPaid, count: sales.length, recentSales: sales.slice(0, 10).map((s) => ({ code: s.code, serviceName: s.serviceName, amount: Number(s.amount), paidAmount: Number(s.paidAmount), status: s.status })) };
  }

  // MC-23: tool đọc MỚI có giá trị thực tế — công nợ project-local, đối xứng
  // với get_debt_summary bên trợ lý AI legacy clinic. DRAFT/CANCELLED không
  // tính là công nợ thật (chưa xác nhận / đã huỷ).
  if (action === "get_project_debt_summary") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const sales = await prisma.zWorkspaceSale.findMany({
      where: { projectId: targetProjectId, status: { in: ["CONFIRMED", "PAID"] } },
      select: { code: true, amount: true, paidAmount: true, customer: { select: { fullName: true, code: true } } },
    });
    const withDebt = sales
      .map((s) => ({ code: s.code, customerName: s.customer?.fullName ?? null, customerCode: s.customer?.code ?? null, debt: Math.max(0, Number(s.amount) - Number(s.paidAmount)) }))
      .filter((s) => s.debt > 0)
      .sort((a, b) => b.debt - a.debt);
    const totalDebt = withDebt.reduce((sum, s) => sum + s.debt, 0);
    return { totalDebt, debtCount: withDebt.length, topDebtors: withDebt.slice(0, 10) };
  }

  if (action === "create_customer_profile") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const { CreateCustomerProfileSchema } = await import("./v2-ai-tool-schemas");
    const parsed = CreateCustomerProfileSchema.parse(args);
    // code phải unique theo [projectId, code]. Date.now() (mili-giây) có thể
    // trùng khi hai job AI chạy gần như đồng thời cho cùng project — thêm hậu
    // tố ngẫu nhiên để tránh vi phạm unique constraint và job FAIL khó hiểu.
    const code = `CUST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const created = await prisma.zWorkspaceCustomer.create({
      data: {
        projectId: targetProjectId,
        createdById: actor.id,
        code,
        fullName: parsed.fullName,
        phoneLast4: parsed.phoneLast4,
        source: parsed.source,
        active: true,
      },
    });
    return { createdCustomer: created };
  }

  if (action === "create_workspace_task") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const { CreateWorkspaceTaskSchema } = await import("./v2-ai-tool-schemas");
    const parsed = CreateWorkspaceTaskSchema.parse(args);
    // assigneeId (nếu có) phải là member ACTIVE của đúng project này — nếu
    // không kiểm, AI có thể gán việc cho người đã rời/không thuộc company.
    if (parsed.assigneeId) {
      const member = await prisma.zProjectMember.findFirst({ where: { projectId: targetProjectId, userId: parsed.assigneeId, active: true }, select: { id: true } });
      if (!member) throw new Error("ASSIGNEE_NOT_ACTIVE_MEMBER");
    }
    const dueAt = parsed.dueDate ? new Date(`${parsed.dueDate}T23:59:59`) : null;
    const created = await prisma.zWorkspaceTask.create({
      data: {
        projectId: targetProjectId,
        createdById: actor.id,
        title: parsed.title,
        description: parsed.description ?? null,
        priority: parsed.priority ?? "NORMAL",
        assigneeId: parsed.assigneeId ?? null,
        dueAt,
      },
    });
    return { createdTask: created };
  }

  if (action === "generate_commission_draft") {
    // MC-17: trước đây tool này nhận thẳng `amount`/`rate` do AI tự đưa ra —
    // AI có thể bịa số bất kỳ, "đẹp số liệu chưng cho đẹp" chứ không phản ánh
    // dữ liệu thật. Nay bắt buộc tra CẢ giao dịch thật (ZWorkspaceSale) lẫn
    // cơ chế hoa hồng ACTIVE thật (ZMechanismVersion) của đúng company, dùng
    // ĐÚNG công thức mà money path thật (v2-payroll-calculation.ts,
    // calculateCommissionPreview) đang dùng — không tự chế công thức riêng.
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const { GenerateCommissionDraftSchema } = await import("./v2-ai-tool-schemas");
    const { parsePayrollRuleSpec } = await import("./v2-payroll-calculation");
    const parsed = GenerateCommissionDraftSchema.parse(args);

    const sale = await prisma.zWorkspaceSale.findFirst({
      where: { projectId: targetProjectId, code: parsed.salesCode },
      select: { code: true, amount: true, paidAmount: true, status: true },
    });
    if (!sale) throw new Error("SALE_NOT_FOUND");

    const mechanismVersion = await prisma.zMechanismVersion.findFirst({
      where: { status: "ACTIVE", definition: { projectId: targetProjectId, kind: "COMMISSION" } },
      select: { version: true, ruleSpec: true, definition: { select: { code: true, name: true } } },
      // approvedAt (không phải version) vì "version desc" không so được đúng
      // giữa NHIỀU definition khác nhau cùng kind COMMISSION (số version của
      // mỗi definition tự đếm riêng từ 1) — lấy đúng cơ chế được kích hoạt
      // GẦN NHẤT nếu company lỡ có hơn 1 cơ chế COMMISSION đang ACTIVE.
      orderBy: { approvedAt: "desc" },
    });
    if (!mechanismVersion) throw new Error("NO_ACTIVE_COMMISSION_MECHANISM");

    const ruleSpec = parsePayrollRuleSpec(mechanismVersion.ruleSpec);
    if (!ruleSpec) throw new Error("MECHANISM_RULESPEC_INVALID");
    if (ruleSpec.basis !== "SALE_PAID") throw new Error("MECHANISM_BASIS_NOT_SUPPORTED_FOR_SINGLE_SALE");

    const basisAmount = Number(sale.paidAmount);
    const commissionValue = Math.floor((basisAmount * ruleSpec.rateBps) / 10000);
    return {
      draftCommission: {
        salesCode: sale.code,
        saleStatus: sale.status,
        saleAmount: Number(sale.amount),
        paidAmount: basisAmount,
        mechanismCode: mechanismVersion.definition.code,
        mechanismVersion: mechanismVersion.version,
        rateBps: ruleSpec.rateBps,
        commissionValue,
        note: parsed.note,
        status: "DRAFT",
      },
    };
  }

  throw new Error(`UNSUPPORTED_JOB_TOOL_ACTION: Tool [${toolName}] Action [${action}] không tồn tại trong registry. Từ chối thực thi.`);
}

export async function executeAiJobRunner(
  jobId: string,
  actorUserId: string
): Promise<AiJobExecutionResult> {
  const job = await prisma.zAiJob.findUnique({
    where: { id: jobId },
    include: {
      targetAgent: true,
      targetProject: true,
      requestedBy: true,
    },
  });

  if (!job) {
    return { ok: false, jobId, status: "FAILED", attempt: 0, error: "JOB_NOT_FOUND" };
  }

  if (job.status === "SUCCEEDED" || job.status === "CANCELLED" || job.status === "TIMED_OUT") {
    return {
      ok: job.status === "SUCCEEDED",
      jobId,
      status: job.status as AiJobStatus,
      attempt: job.attempt,
      resultMeta: (job.resultMeta as Record<string, unknown>) ?? undefined,
      error: job.lastError ?? undefined,
    };
  }

  const requester = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true },
  });

  if (!requester) {
    return { ok: false, jobId, status: "FAILED", attempt: job.attempt, error: "ACTOR_NOT_FOUND" };
  }

  // Dựa vào targetAgent.kind (đã include, đáng tin) chứ KHÔNG suy đoán từ
  // targetProjectId != null. Bug thật đã tìm thấy: GLOBAL agent điều khiển một
  // CHILD agent cụ thể (vd suspend_child_agent) luôn có targetProjectId khác
  // null (project của CHILD bị ảnh hưởng) — suy đoán cũ coi đây là workspace
  // PROJECT rồi đi tìm CHILD agent tại targetAgentId, trong khi targetAgentId
  // THẬT SỰ là GLOBAL agent đang thực thi → luôn FAILED "Không có AI ACTIVE
  // đúng phạm vi workspace". ZAiJob schema không lưu targetKind riêng nên
  // targetAgent.kind là nguồn sự thật đúng duy nhất còn lại.
  const targetWorkspace: AiWorkspaceContext =
    job.targetAgent.kind === "GLOBAL"
      ? { workspaceKind: "GLOBAL" }
      : { workspaceKind: "PROJECT", projectId: job.targetProjectId ?? undefined };

  const agentResolution = await resolveRuntimeAiAgent(requester, targetWorkspace, job.targetAgentId);
  if (!agentResolution.ok || !agentResolution.agent) {
    const errorMsg = agentResolution.ok ? "AGENT_NOT_ACTIVE_IN_SCOPE" : agentResolution.reason;
    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lastError: errorMsg,
        finishedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: requester.id,
        action: "V2_AI_JOB_REAUTHORIZATION_FAILED",
        entity: "ZAiJob",
        entityId: jobId,
        meta: { reason: errorMsg },
      },
    });
    return { ok: false, jobId, status: "FAILED", attempt: job.attempt, error: errorMsg };
  }

  const policyCheck = enforceRuntimeAiTool(agentResolution.agent, targetWorkspace, {
    toolName: job.toolName,
    action: job.action,
    projectId: job.targetProjectId ?? undefined,
    targetProjectId: job.targetProjectId ?? undefined,
  });

  if (!policyCheck.ok) {
    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        lastError: policyCheck.reason,
        finishedAt: new Date(),
      },
    });
    return { ok: false, jobId, status: "FAILED", attempt: job.attempt, error: policyCheck.reason };
  }

  // APPROVAL GATE: Kiểm tra risk level. L4/L5 phải qua phê duyệt của con người.
  const approvalPrincipal: AiPrincipal = {
    userId: requester.id,
    role: requester.role,
    agentProfile: "OPERATOR",
    workspaceKind: targetWorkspace.workspaceKind,
    activeProjectId: job.targetProjectId ?? undefined,
    projectIds: job.targetProjectId ? [job.targetProjectId] : [],
    capabilities: [job.action],
  };
  const riskAssessment = evaluateAiToolRequest(approvalPrincipal, {
    toolName: job.toolName,
    action: job.action,
    resource: job.targetProjectId ?? "system",
    projectId: job.targetProjectId ?? undefined,
    ...writeIrreversibility(job.action),
  });

  const requiresApproval = (riskAssessment.riskLevel === "L4" || riskAssessment.riskLevel === "L5")
    && riskAssessment.decision !== "ALLOW";
  const jobApprovalId = (job as Record<string, unknown>).approvalId as string | null | undefined;

  if (requiresApproval && !jobApprovalId?.trim()) {
    // Job chưa được phê duyệt → chuyển sang PENDING_APPROVAL, sinh preview JSON
    const previewDraft = {
      toolName: job.toolName,
      action: job.action,
      arguments: job.arguments,
      riskLevel: riskAssessment.riskLevel,
      consequences: riskAssessment.consequences,
      requiredApprovals: riskAssessment.requiredApprovals,
      requestedAt: new Date().toISOString(),
    };
    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING_APPROVAL" as any,
        resultMeta: previewDraft as Prisma.InputJsonValue,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: requester.id,
        action: "V2_AI_JOB_REQUIRES_APPROVAL",
        entity: "ZAiJob",
        entityId: jobId,
        meta: { riskLevel: riskAssessment.riskLevel, consequences: riskAssessment.consequences },
      },
    });
    return {
      ok: false,
      jobId,
      status: "PENDING_APPROVAL" as AiJobStatus,
      attempt: job.attempt,
      error: `APPROVAL_REQUIRED: Risk ${riskAssessment.riskLevel} — ${riskAssessment.warningTitle ?? "Cần phê duyệt từ Admin"}`,
    };
  }

  const currentAttempt = job.attempt + 1;

  // ATOMIC LOCK: Dùng updateMany với WHERE status='QUEUED' để tránh 2 worker
  // cùng nhận 1 job. Chỉ worker nào match điều kiện đầu tiên mới update thành công (count=1).
  const lockResult = await prisma.zAiJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: {
      status: "RUNNING",
      attempt: currentAttempt,
      startedAt: new Date(),
    },
  });
  if (lockResult.count === 0) {
    // Job đã bị worker khác chiếm hoặc đã chuyển trạng thái → dừng ngay
    return { ok: false, jobId, status: job.status as AiJobStatus, attempt: job.attempt, error: "JOB_ALREADY_RUNNING_OR_PROCESSED" };
  }

  try {
    // Thực thi timeout đã cam kết trong job contract. Trước đây `timeoutMs` được
    // validate và lưu DB nhưng runner không dùng, nên một tool treo sẽ chạy vô hạn
    // và trạng thái TIMED_OUT không bao giờ đạt tới được.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resultMeta = await Promise.race([
      dispatchJobTool(
        job.toolName,
        job.action,
        job.targetProjectId,
        (job.arguments as Record<string, unknown>) ?? {},
        requester
      ),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(JOB_TIMEOUT_MARKER)), job.timeoutMs);
      }),
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    // VERIFY: đọc lại DB thật, KHÔNG tin dispatchJobTool không throw là đủ.
    const verify = await verifyJobExecution(job.action, resultMeta as Record<string, unknown>);
    const resultMetaWithVerify = { ...(resultMeta as Record<string, unknown>), __verify: { ok: verify.ok, notes: verify.notes, checkedAt: new Date().toISOString() } };

    if (!verify.ok) {
      // Tool trả về "thành công" nhưng state thật KHÔNG khớp — đây là lỗi
      // nghiêm trọng hơn throw thông thường (tool tưởng đúng nhưng sai), nên
      // KHÔNG được coi là SUCCEEDED. Không retry tự động (state đã ghi có thể
      // không idempotent) — dừng lại để người kiểm tra trực tiếp.
      await prisma.zAiJob.update({
        where: { id: jobId },
        data: { status: "FAILED", resultMeta: resultMetaWithVerify as Prisma.InputJsonValue, lastError: `VERIFY_FAILED: ${verify.notes.join("; ")}`, finishedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          actorId: requester.id,
          action: "V2_AI_JOB_VERIFY_FAILED",
          entity: "ZAiJob",
          entityId: jobId,
          meta: { jobId, toolName: job.toolName, action: job.action, targetProjectId: job.targetProjectId, attempt: currentAttempt, notes: verify.notes },
        },
      });
      return { ok: false, jobId, status: "FAILED", attempt: currentAttempt, resultMeta: resultMetaWithVerify, error: `VERIFY_FAILED: ${verify.notes.join("; ")}` };
    }

    const nextStatus = nextAiJobStatus("RUNNING", "SUCCEED");
    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: nextStatus as any,
        resultMeta: resultMetaWithVerify as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: requester.id,
        action: "V2_AI_JOB_SUCCEEDED",
        entity: "ZAiJob",
        entityId: jobId,
        meta: {
          jobId,
          toolName: job.toolName,
          action: job.action,
          targetProjectId: job.targetProjectId,
          attempt: currentAttempt,
          verify: verify.notes,
        },
      },
    });

    return {
      ok: true,
      jobId,
      status: nextStatus,
      attempt: currentAttempt,
      resultMeta: resultMetaWithVerify,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const timedOut = errorMsg === JOB_TIMEOUT_MARKER;
    // Timeout vẫn được retry theo maxAttempts (có thể là sự cố thoáng qua), nhưng
    // khi hết lượt thì trạng thái cuối là TIMED_OUT chứ không phải FAILED — để
    // phân biệt "tool quá chậm" với "tool từ chối/lỗi nghiệp vụ" lúc điều tra.
    const hasRetriesLeft = currentAttempt < job.maxAttempts;
    const finalStatus: AiJobStatus = hasRetriesLeft ? "QUEUED" : timedOut ? "TIMED_OUT" : "FAILED";

    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        lastError: errorMsg,
        finishedAt: hasRetriesLeft ? null : new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: requester.id,
        action: hasRetriesLeft ? "V2_AI_JOB_RETRY_SCHEDULED" : timedOut ? "V2_AI_JOB_TIMED_OUT" : "V2_AI_JOB_FAILED",
        entity: "ZAiJob",
        entityId: jobId,
        meta: {
          jobId,
          attempt: currentAttempt,
          maxAttempts: job.maxAttempts,
          error: errorMsg,
        },
      },
    });

    return {
      ok: false,
      jobId,
      status: finalStatus,
      attempt: currentAttempt,
      error: errorMsg,
    };
  }
}
