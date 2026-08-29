/**
 * MC-18 — Bằng chứng runtime: mọi Đơn vị/company mới tạo qua
 * `createV2ProjectAction` LUÔN có sẵn 1 AI con (ZAiAgent kind=CHILD), kể cả
 * khi caller không gửi aiName/aiPrompt (vd script/API sau này bỏ qua UI wizard
 * — trước đây `if (aiName)` khiến trường hợp này KHÔNG có AI nào cả).
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
let scenarioUserId = "";
vi.mock("./auth", () => ({
  requireUser: async () => ({ id: scenarioUserId, role: "ADMIN" }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const CODE_PREFIX = "ITEST-DEFAULTAI-";

type Ctx = { prisma: typeof import("./db").prisma; adminId: string };
let ctx: Ctx;
const createdCodes: string[] = [];

describe.runIf(enabled)("MC-18 AI con mặc định khi tạo project (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_default_ai_admin__" },
      update: {},
      create: { username: "__qa_default_ai_admin__", fullName: "QA Default AI Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    ctx = { prisma, adminId: admin.id };
    scenarioUserId = admin.id;
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    const projects = await ctx.prisma.zProject.findMany({ where: { code: { in: createdCodes } }, select: { id: true } });
    const ids = projects.map((p) => p.id);
    await ctx.prisma.zAiAgent.deleteMany({ where: { projectId: { in: ids } } });
    await ctx.prisma.zWorkspaceConfigVersion.deleteMany({ where: { projectId: { in: ids } } });
    await ctx.prisma.zProjectMember.deleteMany({ where: { projectId: { in: ids } } });
    await ctx.prisma.zProject.deleteMany({ where: { id: { in: ids } } });
  });

  it("tạo project KHÔNG gửi aiName/aiPrompt vẫn tự có AI con ACTIVE", async () => {
    const { createV2ProjectAction } = await import("./v2-project-actions");
    const code = `${CODE_PREFIX}${Date.now()}`;
    createdCodes.push(code);

    const res = await createV2ProjectAction({}, form({
      code, name: "ITest Default AI Co", description: "", projectType: "OTHER", initialStatus: "ACTIVE",
      // KHÔNG set aiName/aiPrompt — mô phỏng caller bỏ qua UI wizard.
    }));
    expect(res.error, `tạo project phải thành công: ${JSON.stringify(res)}`).toBeUndefined();

    const project = await ctx.prisma.zProject.findFirstOrThrow({ where: { code } });
    const agent = await ctx.prisma.zAiAgent.findFirst({ where: { projectId: project.id, kind: "CHILD" } });
    expect(agent, "project phải có sẵn AI con ngay cả khi không gửi aiName").toBeTruthy();
    expect(agent?.status).toBe("ACTIVE");
    expect(agent?.name).toBe(`Trợ lý ${project.name}`);
  });

  it("tạo project CÓ gửi aiName/aiPrompt dùng đúng giá trị admin nhập", async () => {
    const { createV2ProjectAction } = await import("./v2-project-actions");
    const code = `${CODE_PREFIX}${Date.now()}-B`;
    createdCodes.push(code);

    const res = await createV2ProjectAction({}, form({
      code, name: "ITest Named AI Co", description: "", projectType: "OTHER", initialStatus: "ACTIVE",
      aiName: "Trợ lý Kho vận", aiPrompt: "Chuyên hỗ trợ theo dõi tồn kho.",
    }));
    expect(res.error).toBeUndefined();

    const project = await ctx.prisma.zProject.findFirstOrThrow({ where: { code } });
    const agent = await ctx.prisma.zAiAgent.findFirst({ where: { projectId: project.id, kind: "CHILD" } });
    expect(agent?.name).toBe("Trợ lý Kho vận");
    expect(agent?.systemPrompt).toBe("Chuyên hỗ trợ theo dõi tồn kho.");
  });
});
