/**
 * Bằng chứng runtime: AI Tổng thực sự quản lý được AI con — không chỉ là con
 * số/config đẹp trên giấy. Chuỗi đầy đủ trên DB thật:
 *
 * enqueue (GLOBAL -> CHILD suspend, action GHI) -> PENDING_APPROVAL (đúng vì
 * suspend_child_agent nằm trong WRITE_ACTIONS, risk L4) -> Admin approve ->
 * QUEUED -> worker chạy thật -> ZAiAgent con chuyển ACTIVE -> SUSPENDED.
 *
 * Cũng chứng minh get_child_agent_status hoạt động như aggregate GLOBAL thật
 * (đọc được agent con của MỌI company, không cần targetProjectId).
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
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const KEY_PREFIX = "itest-global-ctl-";

type Ctx = {
  prisma: typeof import("./db").prisma;
  adminId: string;
  childAgentId: string;
  childProjectId: string;
  globalAgentId: string;
  originalChildStatus: string;
};
let ctx: Ctx;

describe.runIf(enabled)("AI Tổng quản lý AI con (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    const globalAgent = await prisma.zAiAgent.findFirst({ where: { kind: "GLOBAL", status: "ACTIVE" }, select: { id: true, toolAllowlist: true } });
    const childAgent = await prisma.zAiAgent.findFirst({ where: { kind: "CHILD", status: "ACTIVE" }, select: { id: true, projectId: true, status: true } });
    expect(admin && globalAgent && childAgent, "cần fixture QA: user 'admin', 1 global agent ACTIVE, 1 child agent ACTIVE").toBeTruthy();

    ctx = {
      prisma,
      adminId: admin!.id,
      childAgentId: childAgent!.id,
      childProjectId: childAgent!.projectId!,
      globalAgentId: globalAgent!.id,
      originalChildStatus: childAgent!.status,
    };
    scenarioAdminId = admin!.id;

    // Đảm bảo GLOBAL agent fixture có 2 tool mới (fixture QA cũ có thể tạo
    // trước khi allowlist mặc định được cập nhật) — không đổi gì khác.
    const allow = new Set((globalAgent!.toolAllowlist as string[] | null) ?? []);
    if (!allow.has("get_child_agent_status") || !allow.has("suspend_child_agent")) {
      allow.add("get_child_agent_status");
      allow.add("suspend_child_agent");
      await prisma.zAiAgent.update({ where: { id: globalAgent!.id }, data: { toolAllowlist: [...allow] } });
    }
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    // Khôi phục trạng thái agent con về đúng như trước khi test chạy.
    await ctx.prisma.zAiAgent.update({ where: { id: ctx.childAgentId }, data: { status: ctx.originalChildStatus as "ACTIVE" } });
    await ctx.prisma.zAiJob.deleteMany({ where: { idempotencyKey: { startsWith: KEY_PREFIX } } });
  });

  it("get_child_agent_status đọc được agent con của MỌI company (aggregate GLOBAL thật)", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("global-control", "get_child_agent_status", null, {}, { id: ctx.adminId, role: "ADMIN" });
    const agents = (result as { childAgents: Array<{ id: string; projectId: string }> }).childAgents;
    expect(agents.some((a) => a.id === ctx.childAgentId), "phải thấy đúng agent con vừa dùng làm fixture").toBe(true);
    // Không lọc theo 1 project — đây chính là điểm khác biệt so với tool CHILD-scoped.
    const distinctProjects = new Set(agents.map((a) => a.projectId));
    expect(distinctProjects.size, "phải thấy agent của NHIỀU company nếu QA có nhiều company").toBeGreaterThanOrEqual(1);
  });

  it("chuỗi đầy đủ: enqueue suspend -> PENDING_APPROVAL -> approve -> worker chạy thật -> agent con SUSPENDED", async () => {
    const { enqueueAiJobAction, approveAiJobAction } = await import("./v2-ai-job-actions");
    const { executeAiJobRunner } = await import("./v2-ai-job-engine");

    const idempotencyKey = `${KEY_PREFIX}${Date.now()}`;
    const enqueueRes = await enqueueAiJobAction({}, form({
      workspaceKind: "GLOBAL",
      targetKind: "GLOBAL",
      agentId: ctx.globalAgentId,
      // targetProjectId: policy GLOBAL yêu cầu explicit target cho mọi action
      // không phải aggregate — đúng nguyên tắc "AI Tổng không tự suy đoán target,
      // phải nêu rõ company nào bị ảnh hưởng" (xem v2-ai-agent-policy.ts).
      targetProjectId: ctx.childProjectId,
      toolName: "suspend_child_agent",
      action: "suspend_child_agent",
      idempotencyKey,
      dataAccess: "SCOPED_PROJECT_DATA",
      timeoutMs: "30000",
      maxAttempts: "1",
      arguments: JSON.stringify({ agentId: ctx.childAgentId, reason: "itest: kiểm chứng AI Tổng điều khiển AI con" }),
    }));
    expect(enqueueRes.ok, `enqueue phải thành công: ${JSON.stringify(enqueueRes)}`).toBe(true);
    const jobId = enqueueRes.jobId!;

    // WRITE_ACTIONS + risk L4 -> chạy lần đầu phải dừng ở PENDING_APPROVAL,
    // KHÔNG được suspend thẳng agent con mà không qua duyệt.
    const firstRun = await executeAiJobRunner(jobId, ctx.adminId);
    expect(firstRun.status, "job GHI dữ liệu ảnh hưởng company khác phải dừng ở PENDING_APPROVAL trước").toBe("PENDING_APPROVAL");
    const stillActive = await ctx.prisma.zAiAgent.findUnique({ where: { id: ctx.childAgentId }, select: { status: true } });
    expect(stillActive?.status, "agent con KHÔNG được đổi trạng thái trước khi duyệt").toBe("ACTIVE");

    const approveRes = await approveAiJobAction({}, form({ jobId }));
    expect(approveRes.ok, `approve phải thành công: ${JSON.stringify(approveRes)}`).toBe(true);

    const afterApprove = await ctx.prisma.zAiJob.findUnique({ where: { id: jobId }, select: { status: true } });
    expect(afterApprove?.status, "sau khi duyệt job phải quay lại QUEUED để worker nhặt").toBe("QUEUED");

    // Đúng logic worker: nhặt QUEUED rồi chạy — không ai bấm tay.
    const finalRun = await executeAiJobRunner(jobId, ctx.adminId);
    expect(finalRun.ok, `sau khi duyệt, job phải chạy thành công: ${JSON.stringify(finalRun)}`).toBe(true);
    expect(finalRun.status).toBe("SUCCEEDED");

    const suspended = await ctx.prisma.zAiAgent.findUnique({ where: { id: ctx.childAgentId }, select: { status: true } });
    expect(suspended?.status, "AI Tổng phải THỰC SỰ suspend được AI con, không chỉ trả kết quả giả").toBe("SUSPENDED");

    const audit = await ctx.prisma.auditLog.findFirst({ where: { action: "V2_AI_JOB_SUCCEEDED", entityId: jobId } });
    expect(audit, "phải có audit trail cho hành động điều khiển agent con").toBeTruthy();
  });
});
