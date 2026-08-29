/**
 * MC-17 — Bằng chứng runtime cho generate_commission_draft dùng dữ liệu THẬT:
 * trước đây tool nhận thẳng amount/rate do AI tự đưa ra (không đọc DB, có thể
 * bịa số). Nay phải tra đúng ZWorkspaceSale + ZMechanismVersion ACTIVE thật
 * của company, tính bằng ĐÚNG công thức money path thật đang dùng
 * (calculateCommissionPreview). Test trên QA DB thật, project cô lập riêng
 * (không đụng fixture project khác đang có sẵn cơ chế COMMISSION khác).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

const CODE_PREFIX = "ITEST-COMDRAFT-";

type Ctx = {
  prisma: typeof import("./db").prisma;
  projectId: string;
  adminId: string;
};
let ctx: Ctx;

describe.runIf(enabled)("MC-17 generate_commission_draft dùng dữ liệu thật (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_commission_draft_admin__" },
      update: {},
      create: { username: "__qa_commission_draft_admin__", fullName: "QA Commission Draft Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    // Project RIÊNG, cô lập — không tái dùng project chung của các itest khác
    // (tránh đụng cơ chế COMMISSION ACTIVE đã có sẵn, làm sai lệch test
    // NO_ACTIVE_COMMISSION_MECHANISM).
    const code = `${CODE_PREFIX}${Date.now()}`;
    const project = await prisma.zProject.create({
      data: { code, name: "ITest Commission Draft Co", projectType: "OTHER", status: "ACTIVE", ownerUserId: admin.id, currency: "VND", enabledFeatures: [] },
    });
    await prisma.zProjectMember.create({ data: { projectId: project.id, userId: admin.id, preset: "PROJECT_ADMIN", active: true } });
    ctx = { prisma, projectId: project.id, adminId: admin.id };
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    await ctx.prisma.zWorkspaceSale.deleteMany({ where: { projectId: ctx.projectId } });
    await ctx.prisma.zMechanismVersion.deleteMany({ where: { definition: { projectId: ctx.projectId } } });
    await ctx.prisma.zMechanismDefinition.deleteMany({ where: { projectId: ctx.projectId } });
    await ctx.prisma.zProjectMember.deleteMany({ where: { projectId: ctx.projectId } });
    await ctx.prisma.zProject.deleteMany({ where: { id: ctx.projectId } });
  });

  it("từ chối salesCode không tồn tại — không được bịa số cho giao dịch không có thật", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    await expect(
      dispatchJobTool("child-agent", "generate_commission_draft", ctx.projectId, { salesCode: "SALE-KHONG-TON-TAI" }, { id: ctx.adminId, role: "ADMIN" })
    ).rejects.toThrow("SALE_NOT_FOUND");
  });

  it("từ chối khi company chưa có cơ chế hoa hồng ACTIVE nào — không được tự chế tỷ lệ", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const sale = await ctx.prisma.zWorkspaceSale.create({
      data: { projectId: ctx.projectId, code: "SALE-001", serviceName: "Gói dịch vụ A", amount: 10_000_000, paidAmount: 10_000_000, status: "PAID", createdById: ctx.adminId },
    });
    await expect(
      dispatchJobTool("child-agent", "generate_commission_draft", ctx.projectId, { salesCode: sale.code }, { id: ctx.adminId, role: "ADMIN" })
    ).rejects.toThrow("NO_ACTIVE_COMMISSION_MECHANISM");
  });

  it("tính đúng bằng dữ liệu thật: paidAmount thật x rateBps thật của cơ chế ACTIVE thật", async () => {
    const def = await ctx.prisma.zMechanismDefinition.create({
      data: { projectId: ctx.projectId, code: `${CODE_PREFIX}MECH`, name: "Hoa hồng 15% theo thực thu", kind: "COMMISSION", status: "ACTIVE" },
    });
    await ctx.prisma.zMechanismVersion.create({
      data: {
        definitionId: def.id, version: 1, status: "ACTIVE", inputSchema: {},
        ruleSpec: { basis: "SALE_PAID", rateBps: 1500, allocation: "EQUAL_ACTIVE_MEMBERS" },
        createdById: ctx.adminId, approvedById: ctx.adminId, approvedAt: new Date(), effectiveFrom: new Date(),
      },
    });

    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("child-agent", "generate_commission_draft", ctx.projectId, { salesCode: "SALE-001", note: "kiểm chứng MC-17" }, { id: ctx.adminId, role: "ADMIN" });
    const draft = (result as { draftCommission: Record<string, unknown> }).draftCommission;

    // paidAmount thật = 10.000.000 (đã ghi ở test trước, KHÔNG phải số AI đưa vào) x 15% = 1.500.000.
    expect(draft.paidAmount).toBe(10_000_000);
    expect(draft.rateBps).toBe(1500);
    expect(draft.commissionValue, "phải tính đúng từ dữ liệu thật, không phải số AI tự bịa").toBe(1_500_000);
    expect(draft.mechanismCode).toBe(`${CODE_PREFIX}MECH`);
    expect(draft.status).toBe("DRAFT");
  });
});
