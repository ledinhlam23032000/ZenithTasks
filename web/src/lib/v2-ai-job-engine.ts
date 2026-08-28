import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { enforceRuntimeAiTool, resolveRuntimeAiAgent } from "./v2-ai-agent-runtime";
import { nextAiJobStatus, type AiJobStatus } from "./v2-ai-job-contract";
import { evaluateAiToolRequest, type AiWorkspaceContext, type AiPrincipal } from "./ai-governance";

const JOB_TIMEOUT_MARKER = "JOB_TIMEOUT_EXCEEDED";

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

  if (action === "create_customer_profile") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const { CreateCustomerProfileSchema } = await import("./v2-ai-tool-schemas");
    const parsed = CreateCustomerProfileSchema.parse(args);
    const created = await prisma.zWorkspaceCustomer.create({
      data: {
        projectId: targetProjectId,
        createdById: actor.id,
        code: `CUST-${Date.now()}`,
        fullName: parsed.fullName,
        phoneLast4: parsed.phoneLast4,
        source: parsed.source,
        active: true,
      },
    });
    return { createdCustomer: created };
  }

  if (action === "generate_commission_draft") {
    if (!targetProjectId) throw new Error("TARGET_PROJECT_REQUIRED");
    const { GenerateCommissionDraftSchema } = await import("./v2-ai-tool-schemas");
    const parsed = GenerateCommissionDraftSchema.parse(args);
    const commissionValue = parsed.amount * (parsed.rate / 100);
    return {
      draftCommission: {
        salesCode: parsed.salesCode,
        amount: parsed.amount,
        rate: parsed.rate,
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

  const targetWorkspace: AiWorkspaceContext =
    job.targetProjectId
      ? { workspaceKind: "PROJECT", projectId: job.targetProjectId }
      : { workspaceKind: "GLOBAL" };

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

    const nextStatus = nextAiJobStatus("RUNNING", "SUCCEED");
    await prisma.zAiJob.update({
      where: { id: jobId },
      data: {
        status: nextStatus as any,
        resultMeta: resultMeta as Prisma.InputJsonValue,
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
        },
      },
    });

    return {
      ok: true,
      jobId,
      status: nextStatus,
      attempt: currentAttempt,
      resultMeta,
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
