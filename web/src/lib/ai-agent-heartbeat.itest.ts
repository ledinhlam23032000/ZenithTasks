/**
 * Bằng chứng runtime cho MC-09/10: agent tự cập nhật `lastHeartbeatAt` mỗi khi
 * thực sự phục vụ một request qua policy gate — trước đây field này chỉ được
 * set MỘT LẦN lúc tạo agent, dashboard health luôn báo "cũ" dù agent vẫn hoạt
 * động bình thường.
 */
import { afterAll, describe, expect, it } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const enabled =
  process.env.QA_CONFIRM === "YES" &&
  rawUrl !== "" &&
  /(qa|test|staging)/i.test(rawUrl) &&
  !/(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
if (enabled) process.env.DATABASE_URL = rawUrl;

describe.runIf(enabled)("Agent heartbeat tự cập nhật khi phục vụ request (QA database)", () => {
  let touchedAgentId = "";

  afterAll(async () => {
    if (touchedAgentId) {
      const { prisma } = await import("./db");
      // Không xoá agent (thuộc fixture QA dùng chung) — chỉ không cần dọn gì
      // thêm vì test chỉ đổi lastHeartbeatAt, không tạo bản ghi mới.
      void prisma;
    }
  });

  it("gọi enforceRuntimeAiTool qua đúng gate policy -> lastHeartbeatAt được cập nhật mới", async () => {
    const { prisma } = await import("./db");
    const { resolveRuntimeAiAgent, enforceRuntimeAiTool } = await import("./v2-ai-agent-runtime");

    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true, role: true } });
    const agent = await prisma.zAiAgent.findFirst({ where: { kind: "CHILD", status: "ACTIVE" }, select: { id: true, projectId: true } });
    expect(admin && agent, "cần fixture QA: user 'admin' và 1 child agent ACTIVE").toBeTruthy();
    touchedAgentId = agent!.id;

    // Đẩy lastHeartbeatAt về một mốc cũ (giả lập "agent tạo từ lâu, không ai đụng tới").
    const staleTime = new Date(Date.now() - 60 * 60 * 1000); // 1 giờ trước
    await prisma.zAiAgent.update({ where: { id: agent!.id }, data: { lastHeartbeatAt: staleTime } });

    const resolution = await resolveRuntimeAiAgent({ id: admin!.id, role: admin!.role }, { workspaceKind: "PROJECT", projectId: agent!.projectId! });
    expect(resolution.ok, `resolve phải thành công: ${JSON.stringify(resolution)}`).toBe(true);
    if (!resolution.ok) return;

    const gate = enforceRuntimeAiTool(resolution.agent, { workspaceKind: "PROJECT", projectId: agent!.projectId! }, { toolName: "get_project_tasks", action: "get_project_tasks", projectId: agent!.projectId! });
    expect(gate.ok, `policy gate phải cho qua: ${JSON.stringify(gate)}`).toBe(true);

    // touchHeartbeat() là fire-and-forget (không await được từ enforceRuntimeAiTool,
    // xem comment trong v2-ai-agent-runtime.ts) — đợi một nhịp event loop để nó chạy xong.
    await new Promise((r) => setTimeout(r, 200));

    const after = await prisma.zAiAgent.findUnique({ where: { id: agent!.id }, select: { lastHeartbeatAt: true } });
    expect(after?.lastHeartbeatAt, "phải có heartbeat").toBeTruthy();
    expect(after!.lastHeartbeatAt!.getTime(), "heartbeat phải MỚI HƠN mốc cũ đã đặt").toBeGreaterThan(staleTime.getTime());
    expect(Date.now() - after!.lastHeartbeatAt!.getTime(), "heartbeat phải vừa mới cập nhật (trong vài giây)").toBeLessThan(5000);
  });
});
