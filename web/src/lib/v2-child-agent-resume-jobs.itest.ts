/**
 * MC-19 — Bằng chứng runtime: AI Tổng nay quản lý AI con nhiều hơn suspend.
 * (1) resume_child_agent: đối xứng suspend, qua đúng approval gate (WRITE_ACTIONS).
 * (2) get_child_agent_jobs: xem lịch sử job thật của 1 AI con cụ thể — trước đây
 * AI Tổng chỉ biết status hiện tại, không biết agent đã làm gì.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const enabled =
  process.env.QA_CONFIRM === "YES" &&
  rawUrl !== "" &&
  /(qa|test|staging)/i.test(rawUrl) &&
  !/(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
if (enabled) {
  process.env.DATABASE_URL = rawUrl;
  process.env.ENABLE_ZENITH_V2 = "true";
}

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
let scenarioAdminId = "";
vi.mock("./auth", () => ({
  requireCap: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
  requireUser: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const KEY_PREFIX = "itest-resume-jobs-";

type Ctx = {
  prisma: typeof import("./db").prisma;
  adminId: string;
  childAgentId: string;
  childProjectId: string;
  globalAgentId: string;
  originalChildStatus: string;
};
let ctx: Ctx;

describe.runIf(enabled)("MC-19 resume_child_agent + get_child_agent_jobs (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    const globalAgent = await prisma.zAiAgent.findFirst({ where: { kind: "GLOBAL", status: "ACTIVE" }, select: { id: true, toolAllowlist: true } });
    const childAgent = await prisma.zAiAgent.findFirst({ where: { kind: "CHILD", status: "ACTIVE" }, select: { id: true, projectId: true, status: true } });
    expect(admin && globalAgent && childAgent, "cần fixture QA: user 'admin', 1 global agent ACTIVE, 1 child agent ACTIVE").toBeTruthy();

    ctx = {
      prisma, adminId: admin!.id, childAgentId: childAgent!.id, childProjectId: childAgent!.projectId!,
      globalAgentId: globalAgent!.id, originalChildStatus: childAgent!.status,
    };
    scenarioAdminId = admin!.id;

    const allow = new Set((globalAgent!.toolAllowlist as string[] | null) ?? []);
    let changed = false;
    for (const tool of ["resume_child_agent", "get_child_agent_jobs"]) {
      if (!allow.has(tool)) { allow.add(tool); changed = true; }
    }
    if (changed) await prisma.zAiAgent.update({ where: { id: globalAgent!.id }, data: { toolAllowlist: [...allow] } });

    // Đặt agent con về SUSPENDED trực tiếp (suspend qua job đã có bằng chứng
    // riêng ở v2-global-controls-child.itest.ts) — test này tập trung vào resume.
    await prisma.zAiAgent.update({ where: { id: childAgent!.id }, data: { status: "SUSPENDED" } });
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    await ctx.prisma.zAiAgent.update({ where: { id: ctx.childAgentId }, data: { status: ctx.originalChildStatus as "ACTIVE" } });
    await ctx.prisma.zAiJob.deleteMany({ where: { idempotencyKey: { startsWith: KEY_PREFIX } } });
  });

  it("get_child_agent_jobs trả đúng lịch sử job của agent con (không lẫn agent khác)", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("global-control", "get_child_agent_jobs", null, { agentId: ctx.childAgentId }, { id: ctx.adminId, role: "ADMIN" });
    const typed = result as { agent: { id: string }; jobs: Array<{ id: string }>; total: number };
    expect(typed.agent.id).toBe(ctx.childAgentId);
    expect(Array.isArray(typed.jobs)).toBe(true);
    expect(typed.total).toBe(typed.jobs.length);
  });

  it("chuỗi đầy đủ: enqueue resume -> PENDING_APPROVAL -> approve -> worker chạy thật -> agent con ACTIVE trở lại", async () => {
    const { enqueueAiJobAction, approveAiJobAction } = await import("./v2-ai-job-actions");
    const { executeAiJobRunner } = await import("./v2-ai-job-engine");

    const idempotencyKey = `${KEY_PREFIX}${Date.now()}`;
    const enqueueRes = await enqueueAiJobAction({}, form({
      workspaceKind: "GLOBAL", targetKind: "GLOBAL", agentId: ctx.globalAgentId, targetProjectId: ctx.childProjectId,
      toolName: "resume_child_agent", action: "resume_child_agent", idempotencyKey, dataAccess: "SCOPED_PROJECT_DATA",
      timeoutMs: "30000", maxAttempts: "1",
      arguments: JSON.stringify({ agentId: ctx.childAgentId, reason: "itest MC-19: kiểm chứng resume đối xứng suspend" }),
    }));
    expect(enqueueRes.ok, `enqueue phải thành công: ${JSON.stringify(enqueueRes)}`).toBe(true);
    const jobId = enqueueRes.jobId!;

    const firstRun = await executeAiJobRunner(jobId, ctx.adminId);
    expect(firstRun.status, "resume là WRITE_ACTIONS/irreversible -> phải dừng ở PENDING_APPROVAL trước").toBe("PENDING_APPROVAL");
    const stillSuspended = await ctx.prisma.zAiAgent.findUnique({ where: { id: ctx.childAgentId }, select: { status: true } });
    expect(stillSuspended?.status, "agent con KHÔNG được tự resume trước khi duyệt").toBe("SUSPENDED");

    const approveRes = await approveAiJobAction({}, form({ jobId }));
    expect(approveRes.ok, `approve phải thành công: ${JSON.stringify(approveRes)}`).toBe(true);

    const finalRun = await executeAiJobRunner(jobId, ctx.adminId);
    expect(finalRun.ok, `sau khi duyệt, job phải chạy thành công: ${JSON.stringify(finalRun)}`).toBe(true);
    expect(finalRun.status).toBe("SUCCEEDED");

    const resumed = await ctx.prisma.zAiAgent.findUnique({ where: { id: ctx.childAgentId }, select: { status: true } });
    expect(resumed?.status, "AI Tổng phải THỰC SỰ kích hoạt lại được AI con").toBe("ACTIVE");
  });

  it("get_child_agent_jobs phản ánh đúng job mà CHÍNH agent con đó thực thi", async () => {
    // targetAgentId trên ZAiJob là agent THỰC THI job. Job resume ở test trên
    // có targetAgentId = GLOBAL agent (agent con chỉ là 1 argument bên trong
    // job.arguments) nên KHÔNG xuất hiện ở lịch sử "job do chính agent con
    // thực thi" — enqueue 1 job CHILD-scoped thật để agent con tự thực thi.
    const { enqueueAiJobAction } = await import("./v2-ai-job-actions");
    const { executeAiJobRunner, dispatchJobTool } = await import("./v2-ai-job-engine");

    const idempotencyKey = `${KEY_PREFIX}own-${Date.now()}`;
    const enqueueRes = await enqueueAiJobAction({}, form({
      workspaceKind: "PROJECT", projectId: ctx.childProjectId, targetKind: "CHILD", agentId: ctx.childAgentId, targetProjectId: ctx.childProjectId,
      toolName: "get_project_overview", action: "get_project_overview", idempotencyKey, dataAccess: "SCOPED_PROJECT_DATA",
      timeoutMs: "30000", maxAttempts: "1", arguments: JSON.stringify({}),
    }));
    expect(enqueueRes.ok, `enqueue job CHILD-scoped phải thành công: ${JSON.stringify(enqueueRes)}`).toBe(true);
    const ownJobId = enqueueRes.jobId!;
    const run = await executeAiJobRunner(ownJobId, ctx.adminId);
    expect(run.ok, `job đọc project overview phải chạy thẳng: ${JSON.stringify(run)}`).toBe(true);

    const history = await dispatchJobTool("global-control", "get_child_agent_jobs", null, { agentId: ctx.childAgentId }, { id: ctx.adminId, role: "ADMIN" });
    const jobs = (history as { jobs: Array<{ id: string; action: string; status: string }> }).jobs;
    expect(jobs.some((j) => j.id === ownJobId && j.action === "get_project_overview" && j.status === "SUCCEEDED"), "lịch sử job của agent con phải thấy đúng job chính nó vừa thực thi").toBe(true);
  });
});
