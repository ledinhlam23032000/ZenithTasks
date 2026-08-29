/**
 * Bằng chứng runtime cho MC-11 worker: job QUEUED được nhặt và chạy TỰ ĐỘNG,
 * không cần ai bấm "Thực thi ngay". Đây là khoảng trống trước wave này — job
 * xếp hàng chỉ chạy khi có người vào UI bấm tay.
 *
 * Test import trực tiếp logic "1 lượt nhặt job" (không chạy vòng lặp vô hạn
 * của scripts/ai-job-worker.ts — sao chép lại đúng câu query + gọi
 * executeAiJobRunner, vì file kịch bản không export hàm để import thẳng).
 */
import { describe, expect, it } from "vitest";

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

const KEY_PREFIX = "itest-worker-";

describe.runIf(enabled)("AI job worker: nhặt QUEUED và chạy tự động (QA database)", () => {
  it("job QUEUED chuyển sang SUCCEEDED khi worker chạy MỘT LƯỢT, không cần bấm tay", async () => {
    const { prisma } = await import("./db");
    const { executeAiJobRunner } = await import("./v2-ai-job-engine");

    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    const agent = await prisma.zAiAgent.findFirst({ where: { kind: "CHILD", status: "ACTIVE" }, select: { id: true, projectId: true } });
    expect(admin && agent, "cần fixture QA: user 'admin' và 1 child agent ACTIVE").toBeTruthy();

    const job = await prisma.zAiJob.create({
      data: {
        idempotencyKey: `${KEY_PREFIX}${Date.now()}`,
        requestedById: admin!.id,
        sourceWorkspaceKind: "PROJECT",
        sourceProjectId: agent!.projectId,
        targetAgentId: agent!.id,
        targetProjectId: agent!.projectId,
        toolName: "task-list",
        action: "get_project_tasks",
        arguments: {},
        dataAccess: "SCOPED_PROJECT_DATA",
        requiresRuntimeReauthorization: true,
        maxAttempts: 1,
        timeoutMs: 30_000,
        status: "QUEUED",
      } as never,
    });

    // Đúng logic "1 lượt" của scripts/ai-job-worker.ts: nhặt QUEUED rồi chạy —
    // không có ai gọi tay executeAiJobAction từ UI.
    const queued = await prisma.zAiJob.findMany({ where: { status: "QUEUED", id: job.id } });
    expect(queued.length, "job vừa tạo phải nằm ở QUEUED chờ worker nhặt").toBe(1);
    for (const q of queued) await executeAiJobRunner(q.id, q.requestedById);

    const after = await prisma.zAiJob.findUnique({ where: { id: job.id }, select: { status: true } });
    expect(after?.status, "worker phải tự đưa job từ QUEUED sang SUCCEEDED").toBe("SUCCEEDED");

    await prisma.zAiJob.deleteMany({ where: { id: job.id } });
  });
});
