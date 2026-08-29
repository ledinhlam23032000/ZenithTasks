/**
 * MC-23 — Bằng chứng runtime cho 3 tool mới: get_project_sales_summary (vá
 * lỗ hổng "toolAllowlist hứa nhưng dispatchJobTool không hỗ trợ"),
 * get_project_debt_summary (tool đọc mới, giá trị thực tế), và
 * get_ecosystem_debt_alert (AI Tổng quét công nợ toàn hệ thống — tính năng
 * chủ động). Project cô lập riêng để không lẫn dữ liệu công nợ project khác.
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

const CODE_PREFIX = "ITEST-DEBTTOOL-";

type Ctx = { prisma: typeof import("./db").prisma; projectId: string; projectCode: string; adminId: string };
let ctx: Ctx;

describe.runIf(enabled)("MC-23 project sales/debt tools + ecosystem debt alert (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_debt_tool_admin__" }, update: {},
      create: { username: "__qa_debt_tool_admin__", fullName: "QA Debt Tool Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    const code = `${CODE_PREFIX}${Date.now()}`;
    const project = await prisma.zProject.create({
      data: { code, name: "ITest Debt Tools Co", projectType: "OTHER", status: "ACTIVE", ownerUserId: admin.id, currency: "VND", enabledFeatures: [] },
    });
    // 1 giao dịch đã thu đủ (không nợ), 1 giao dịch còn nợ 6.000.000 (CONFIRMED,
    // vượt ngưỡng cảnh báo 5tr), 1 giao dịch DRAFT còn thiếu tiền nhưng KHÔNG
    // được tính vào công nợ (chưa xác nhận).
    await prisma.zWorkspaceSale.createMany({
      data: [
        { projectId: project.id, code: "SALE-PAID", serviceName: "Gói A", amount: 3_000_000, paidAmount: 3_000_000, status: "PAID", createdById: admin.id },
        { projectId: project.id, code: "SALE-DEBT", serviceName: "Gói B", amount: 10_000_000, paidAmount: 4_000_000, status: "CONFIRMED", createdById: admin.id },
        { projectId: project.id, code: "SALE-DRAFT", serviceName: "Gói C", amount: 2_000_000, paidAmount: 0, status: "DRAFT", createdById: admin.id },
      ],
    });
    ctx = { prisma, projectId: project.id, projectCode: code, adminId: admin.id };
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    await ctx.prisma.zWorkspaceSale.deleteMany({ where: { projectId: ctx.projectId } });
    await ctx.prisma.zProject.deleteMany({ where: { id: ctx.projectId } });
  });

  it("get_project_sales_summary: tổng đúng, kể cả giao dịch DRAFT (doanh số nói chung, không lọc trạng thái)", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("child-agent", "get_project_sales_summary", ctx.projectId, {}, { id: ctx.adminId, role: "ADMIN" });
    const typed = result as { totalAmount: number; totalPaid: number; count: number };
    expect(typed.count).toBe(3);
    expect(typed.totalAmount).toBe(3_000_000 + 10_000_000 + 2_000_000);
    expect(typed.totalPaid).toBe(3_000_000 + 4_000_000);
  });

  it("get_project_debt_summary: CHỈ tính nợ từ giao dịch CONFIRMED/PAID, bỏ qua DRAFT", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("child-agent", "get_project_debt_summary", ctx.projectId, {}, { id: ctx.adminId, role: "ADMIN" });
    const typed = result as { totalDebt: number; debtCount: number; topDebtors: Array<{ code: string; debt: number }> };
    expect(typed.debtCount, "chỉ SALE-DEBT có nợ thật (CONFIRMED); SALE-PAID hết nợ, SALE-DRAFT chưa xác nhận").toBe(1);
    expect(typed.totalDebt).toBe(6_000_000);
    expect(typed.topDebtors[0].code).toBe("SALE-DEBT");
  });

  it("get_ecosystem_debt_alert: AI Tổng thấy đúng company này trong danh sách cảnh báo (vượt ngưỡng 5tr)", async () => {
    const { dispatchJobTool } = await import("./v2-ai-job-engine");
    const result = await dispatchJobTool("global-control", "get_ecosystem_debt_alert", null, {}, { id: ctx.adminId, role: "ADMIN" });
    const typed = result as { threshold: number; alerts: Array<{ projectCode: string; totalDebt: number }>; companies: Array<{ projectCode: string; totalDebt: number }> };
    expect(typed.threshold).toBe(5_000_000);
    const inAlerts = typed.alerts.find((a) => a.projectCode === ctx.projectCode);
    expect(inAlerts, "company có nợ 6tr (>5tr) phải nằm trong danh sách alerts").toBeTruthy();
    expect(inAlerts?.totalDebt).toBe(6_000_000);
    const inCompanies = typed.companies.find((c) => c.projectCode === ctx.projectCode);
    expect(inCompanies?.totalDebt).toBe(6_000_000);
  });
});
