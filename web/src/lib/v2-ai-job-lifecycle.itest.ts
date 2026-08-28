/**
 * MC-11 — Bằng chứng runtime cho dispatcher/worker AI job trên QA DB thật.
 *
 * Trước wave này MC-11 chỉ có code-level evidence: engine đã viết nhưng chưa từng
 * chạy end-to-end, nên không biết re-authorization lúc thực thi, atomic lock,
 * retry và approval gate có thật sự hoạt động hay không.
 *
 * An toàn: chỉ chạy khi QA_CONFIRM=YES và URL mang dấu hiệu qa/test/staging và
 * KHÔNG mang dấu hiệu clinic/production. Mọi job tạo ra đều bị xoá ở cuối.
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

let currentUser: { id: string; role: string } | null = null;
vi.mock("./auth", () => ({ requireUser: async () => currentUser }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const KEY_PREFIX = "itest-mc11-";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

type Ctx = {
  prisma: typeof import("./db").prisma;
  run: typeof import("./v2-ai-job-engine").executeAiJobRunner;
  approve: typeof import("./v2-ai-job-actions").approveAiJobAction;
  reject: typeof import("./v2-ai-job-actions").rejectAiJobAction;
  adminId: string;
  agentA: string;
  projectA: string;
  agentB: string;
  projectB: string;
};
let ctx: Ctx;

async function makeJob(over: Record<string, unknown> = {}) {
  return ctx.prisma.zAiJob.create({
    data: {
      idempotencyKey: `${KEY_PREFIX}${Math.random().toString(36).slice(2)}-${Date.now()}`,
      requestedById: ctx.adminId,
      sourceWorkspaceKind: "PROJECT",
      sourceProjectId: ctx.projectA,
      targetAgentId: ctx.agentA,
      targetProjectId: ctx.projectA,
      toolName: "task-list",
      action: "get_project_tasks",
      arguments: {},
      dataAccess: "SCOPED_PROJECT_DATA",
      requiresRuntimeReauthorization: true,
      maxAttempts: 1,
      timeoutMs: 30_000,
      ...over,
    } as never,
  });
}

describe.runIf(enabled)("MC-11 AI job dispatcher lifecycle (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const { executeAiJobRunner } = await import("./v2-ai-job-engine");
    const { approveAiJobAction, rejectAiJobAction } = await import("./v2-ai-job-actions");

    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    const agents = await prisma.zAiAgent.findMany({
      where: { kind: "CHILD", status: "ACTIVE" },
      select: { id: true, projectId: true },
    });
    expect(admin, "cần user 'admin'").toBeTruthy();
    expect(agents.length, "cần >=2 child agent ACTIVE").toBeGreaterThanOrEqual(2);

    ctx = {
      prisma,
      run: executeAiJobRunner,
      approve: approveAiJobAction,
      reject: rejectAiJobAction,
      adminId: admin!.id,
      agentA: agents[0].id,
      projectA: agents[0].projectId!,
      agentB: agents[1].id,
      projectB: agents[1].projectId!,
    };
  });

  afterAll(async () => {
    if (ctx?.prisma) {
      await ctx.prisma.zAiJob.deleteMany({ where: { idempotencyKey: { startsWith: KEY_PREFIX } } });
    }
  });

  it("job hợp lệ chạy tới SUCCEEDED và ghi audit", async () => {
    const job = await makeJob();
    const res = await ctx.run(job.id, ctx.adminId);
    expect(res.ok, `expected success, got ${JSON.stringify(res)}`).toBe(true);
    expect(res.status).toBe("SUCCEEDED");
    expect(res.resultMeta).toBeDefined();

    const saved = await ctx.prisma.zAiJob.findUnique({
      where: { id: job.id },
      select: { status: true, finishedAt: true, attempt: true },
    });
    expect(saved?.status).toBe("SUCCEEDED");
    expect(saved?.finishedAt).not.toBeNull();
    expect(saved?.attempt).toBe(1);

    const audit = await ctx.prisma.auditLog.findFirst({
      where: { entity: "ZAiJob", entityId: job.id, action: "V2_AI_JOB_SUCCEEDED" },
    });
    expect(audit, "phải có audit V2_AI_JOB_SUCCEEDED").toBeTruthy();
  });

  it("action lạ bị TỪ CHỐI, không giả vờ thành công", async () => {
    // Bị chặn ngay ở allowlist (TOOL_NOT_ALLOWLISTED) TRƯỚC khi tới dispatcher —
    // phòng thủ nhiều lớp, chặn càng sớm càng tốt. Nếu lọt qua allowlist thì
    // dispatcher vẫn ném UNSUPPORTED_JOB_TOOL_ACTION (xem v2-ai-job-engine.test.ts).
    const job = await makeJob({ toolName: "khong-ton-tai", action: "khong_ton_tai" });
    const res = await ctx.run(job.id, ctx.adminId);
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.error).toMatch(/TOOL_NOT_ALLOWLISTED|UNSUPPORTED_JOB_TOOL_ACTION/);
  });

  it("LEO THANG QUYỀN bị chặn: action ghi dữ liệu không nằm trong allowlist", async () => {
    // Hồi quy cho lỗ hổng thật: gate cũ chỉ kiểm `toolName`, nên gửi
    // toolName="get_project_tasks" (có trong allowlist) kèm
    // action="create_customer_profile" (KHÔNG có) là qua cửa rồi ghi khách hàng mới.
    const before = await ctx.prisma.zWorkspaceCustomer.count({ where: { projectId: ctx.projectA } });
    const job = await makeJob({
      toolName: "get_project_tasks",
      action: "create_customer_profile",
      arguments: { fullName: "Synthetic Escalation", phoneLast4: "0000", source: "ITEST" },
    });
    const res = await ctx.run(job.id, ctx.adminId);
    expect(res.ok, "action ghi ngoài allowlist PHẢI bị từ chối").toBe(false);
    expect(res.error).toMatch(/TOOL_NOT_ALLOWLISTED/);
    expect(await ctx.prisma.zWorkspaceCustomer.count({ where: { projectId: ctx.projectA } })).toBe(before);
  });

  it("atomic lock: chạy lại job đã xử lý không thực thi lần hai", async () => {
    const job = await makeJob();
    const first = await ctx.run(job.id, ctx.adminId);
    expect(first.status).toBe("SUCCEEDED");
    const second = await ctx.run(job.id, ctx.adminId);
    expect(second.status).toBe("SUCCEEDED");
    expect(second.attempt).toBe(1);
  });

  it("re-authorization lúc thực thi chặn agent của company khác", async () => {
    const job = await makeJob({ targetAgentId: ctx.agentB, targetProjectId: ctx.projectA });
    const res = await ctx.run(job.id, ctx.adminId);
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");
    const saved = await ctx.prisma.zAiJob.findUnique({
      where: { id: job.id },
      select: { status: true, lastError: true },
    });
    expect(saved?.status).toBe("FAILED");
    expect(saved?.lastError, "phải ghi lý do từ chối").toBeTruthy();
  });

  it("approve đưa job PENDING_APPROVAL trở lại QUEUED và ghi audit", async () => {
    const job = await makeJob({ status: "PENDING_APPROVAL", resultMeta: { riskLevel: "L4" } });
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const res = await ctx.approve({}, form({ jobId: job.id }));
    expect(res.ok, `expected approve ok, got ${JSON.stringify(res)}`).toBe(true);

    const saved = await ctx.prisma.zAiJob.findUnique({
      where: { id: job.id },
      select: { status: true, approvalId: true },
    });
    expect(saved?.status).toBe("QUEUED");
    expect(saved?.approvalId).toBeTruthy();
    const audit = await ctx.prisma.auditLog.findFirst({
      where: { entity: "ZAiJob", entityId: job.id, action: "V2_AI_JOB_APPROVED" },
    });
    expect(audit).toBeTruthy();
  });

  it("job L5 KHÔNG được tự duyệt bởi chính người yêu cầu (two-person)", async () => {
    const job = await makeJob({ status: "PENDING_APPROVAL", resultMeta: { riskLevel: "L5" } });
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const res = await ctx.approve({}, form({ jobId: job.id }));
    expect(res.ok).toBeUndefined();
    expect(res.error).toMatch(/two-person/i);
    const saved = await ctx.prisma.zAiJob.findUnique({ where: { id: job.id }, select: { status: true } });
    expect(saved?.status, "phải giữ nguyên PENDING_APPROVAL").toBe("PENDING_APPROVAL");
  });

  it("reject chuyển job sang CANCELLED và không chạy được nữa", async () => {
    const job = await makeJob({ status: "PENDING_APPROVAL", resultMeta: { riskLevel: "L4" } });
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const res = await ctx.reject({}, form({ jobId: job.id, reason: "itest" }));
    expect(res.ok).toBe(true);
    const saved = await ctx.prisma.zAiJob.findUnique({ where: { id: job.id }, select: { status: true } });
    expect(saved?.status).toBe("CANCELLED");

    const run = await ctx.run(job.id, ctx.adminId);
    expect(run.status).toBe("CANCELLED");
    expect(run.ok).toBe(false);
  });
});
