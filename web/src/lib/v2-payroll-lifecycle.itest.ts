/**
 * MC-15 — Bằng chứng runtime cho vòng đời PayrollRun đa công ty trên QA thật:
 * create(DRAFT) -> calculate(CALCULATED) -> preview(PREVIEW) -> approve(APPROVED)
 * -> second-approve -> finalize(FINALIZED), và nhánh void.
 *
 * Trước wave này: code + unit test toán thuần đã có, nhưng chưa từng chạy full
 * vòng đời trên DB thật — không biết ràng buộc DB, quan hệ mechanism/run có
 * khớp runtime hay không.
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
let scenarioRole = "ADMIN";
vi.mock("./auth", () => ({
  requireUser: async () => ({ id: scenarioUserId, role: scenarioRole }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const CODE_PREFIX = "ITEST-PR-";

type Ctx = {
  prisma: typeof import("./db").prisma;
  projectId: string;
  adminId: string;
  admin2Id: string;
  mechanismVersionId: string;
  runCode: string;
};
let ctx: Ctx;

describe.runIf(enabled)("MC-15 PayrollRun lifecycle (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const project = await prisma.zProject.findFirst({ where: { status: "ACTIVE" }, select: { id: true } });
    expect(project, "cần >=1 project ACTIVE trên QA").toBeTruthy();

    const admin = await prisma.user.upsert({
      where: { username: "__qa_payroll_admin_1__" },
      update: {},
      create: { username: "__qa_payroll_admin_1__", fullName: "QA Payroll Admin 1", role: "ADMIN", passwordHash: "x", active: true },
    });
    const admin2 = await prisma.user.upsert({
      where: { username: "__qa_payroll_admin_2__" },
      update: {},
      create: { username: "__qa_payroll_admin_2__", fullName: "QA Payroll Admin 2", role: "ADMIN", passwordHash: "x", active: true },
    });

    await prisma.zProjectMember.upsert({
      where: { projectId_userId: { projectId: project!.id, userId: admin.id } },
      update: { active: true },
      create: { projectId: project!.id, userId: admin.id, preset: "PROJECT_ADMIN", active: true },
    });

    // Mechanism definition/version ACTIVE — bắt buộc để tạo PayrollRun (snapshot ruleSpec).
    const def = await prisma.zMechanismDefinition.upsert({
      where: { projectId_code: { projectId: project!.id, code: `${CODE_PREFIX}MECH` } },
      update: {},
      create: { projectId: project!.id, code: `${CODE_PREFIX}MECH`, name: "ITest commission 10%", kind: "COMMISSION", status: "ACTIVE" },
    });
    let version = await prisma.zMechanismVersion.findFirst({ where: { definitionId: def.id, status: "ACTIVE" } });
    if (!version) {
      version = await prisma.zMechanismVersion.create({
        data: {
          definitionId: def.id, version: 1, status: "ACTIVE",
          inputSchema: {}, ruleSpec: { basis: "INCOME_LEDGER", rateBps: 1000, allocation: "EQUAL_ACTIVE_MEMBERS" },
          createdById: admin.id, approvedById: admin.id, approvedAt: new Date(), effectiveFrom: new Date(),
        },
      });
    }

    // Ledger income trong kỳ để có basisAmount > 0. PHẢI nằm trong [periodStart,
    // periodEnd] của PayrollRun bên dưới (2026-01-01..2026-01-31) — calculate lọc
    // theo occurredAt của run, không phải "hôm nay".
    const runCode = `${CODE_PREFIX}${Date.now()}`;
    await prisma.zWorkspaceLedgerEntry.create({
      data: {
        projectId: project!.id, code: `${runCode}-LEDGER`, direction: "INCOME", status: "POSTED",
        category: "SALE", amount: 10_000_000, occurredAt: new Date("2026-01-15T00:00:00.000Z"), createdById: admin.id,
      },
    });

    ctx = { prisma, projectId: project!.id, adminId: admin.id, admin2Id: admin2.id, mechanismVersionId: version.id, runCode };
    scenarioUserId = admin.id;
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    const run = await ctx.prisma.zWorkspacePayrollRun.findFirst({ where: { projectId: ctx.projectId, code: ctx.runCode } });
    if (run) {
      await ctx.prisma.zWorkspacePayrollLine.deleteMany({ where: { runId: run.id } });
      await ctx.prisma.zWorkspacePayrollRun.deleteMany({ where: { id: run.id } });
    }
    await ctx.prisma.zWorkspaceLedgerEntry.deleteMany({ where: { code: `${ctx.runCode}-LEDGER` } });
  });

  it("vòng đời đầy đủ: DRAFT -> CALCULATED -> PREVIEW -> APPROVED -> second-approve -> FINALIZED", async () => {
    const { createWorkspacePayrollRunAction, calculateWorkspacePayrollRunAction } = await import("./v2-payroll-actions");
    const {
      previewWorkspacePayrollRunAction,
      approveWorkspacePayrollRunAction,
      secondApproveWorkspacePayrollRunAction,
      finalizeWorkspacePayrollRunAction,
    } = await import("./v2-payroll-governance-actions");

    scenarioUserId = ctx.adminId;
    const periodStart = "2026-01-01";
    const periodEnd = "2026-01-31";

    const created = await createWorkspacePayrollRunAction({}, form({
      projectId: ctx.projectId, code: ctx.runCode, periodStart, periodEnd, mechanismVersionId: ctx.mechanismVersionId,
    }));
    expect(created.ok, `create phải thành công: ${JSON.stringify(created)}`).toBe(true);

    let run = await ctx.prisma.zWorkspacePayrollRun.findFirstOrThrow({ where: { projectId: ctx.projectId, code: ctx.runCode } });
    expect(run.status).toBe("DRAFT");

    const calc = await calculateWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "CALCULATE" }));
    expect(calc.ok, `calculate phải thành công: ${JSON.stringify(calc)}`).toBe(true);
    const lines = await ctx.prisma.zWorkspacePayrollLine.findMany({ where: { runId: run.id } });
    expect(lines.length, "phải có line cho member active").toBeGreaterThan(0);
    expect(lines.every((l) => l.status === "CALCULATED")).toBe(true);
    // basisAmount 10tr, rateBps 1000 (10%) -> tổng hoa hồng 1.000.000, chia đều cho N member.
    const totalCommission = lines.reduce((s, l) => s + Number(l.commissionAmount), 0);
    expect(totalCommission).toBe(1_000_000);

    const preview = await previewWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "PREVIEW" }));
    expect(preview.ok, `preview phải thành công: ${JSON.stringify(preview)}`).toBe(true);
    run = await ctx.prisma.zWorkspacePayrollRun.findFirstOrThrow({ where: { id: run.id } });
    expect(run.status).toBe("PREVIEW");

    const approve = await approveWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "APPROVE" }));
    expect(approve.ok, `approve phải thành công: ${JSON.stringify(approve)}`).toBe(true);
    run = await ctx.prisma.zWorkspacePayrollRun.findFirstOrThrow({ where: { id: run.id } });
    expect(run.status).toBe("APPROVED");
    expect(run.approvedById).toBe(ctx.adminId);

    // Two-person: người approve đầu tiên KHÔNG được tự second-approve.
    const selfSecond = await secondApproveWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "APPROVE_SECOND" }));
    expect(selfSecond.error, "cùng người approve không được second-approve").toBeTruthy();

    scenarioUserId = ctx.admin2Id;
    await ctx.prisma.zProjectMember.upsert({
      where: { projectId_userId: { projectId: ctx.projectId, userId: ctx.admin2Id } },
      update: { active: true },
      create: { projectId: ctx.projectId, userId: ctx.admin2Id, preset: "PROJECT_ADMIN", active: true },
    });
    const second = await secondApproveWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "APPROVE_SECOND" }));
    expect(second.ok, `second-approve bởi người khác phải thành công: ${JSON.stringify(second)}`).toBe(true);

    const finalize = await finalizeWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "FINALIZE" }));
    expect(finalize.ok, `finalize phải thành công: ${JSON.stringify(finalize)}`).toBe(true);
    run = await ctx.prisma.zWorkspacePayrollRun.findFirstOrThrow({ where: { id: run.id } });
    expect(run.status).toBe("FINALIZED");

    const audits = await ctx.prisma.auditLog.findMany({ where: { entity: "ZWorkspacePayrollRun", entityId: run.id }, select: { action: true } });
    const actions = audits.map((a) => a.action);
    for (const expected of ["V2_PAYROLL_RUN_DRAFT_CREATED", "V2_PAYROLL_PREVIEW_CALCULATED", "V2_PAYROLL_RUN_APPROVED", "V2_PAYROLL_RUN_SECOND_APPROVED", "V2_PAYROLL_RUN_FINALIZED"]) {
      expect(actions, `thiếu audit ${expected}`).toContain(expected);
    }
  });

  it("FINALIZE khi chưa đủ two-person approval bị TỪ CHỐI", async () => {
    const { createWorkspacePayrollRunAction } = await import("./v2-payroll-actions");
    const { finalizeWorkspacePayrollRunAction } = await import("./v2-payroll-governance-actions");
    scenarioUserId = ctx.adminId;

    const code = `${ctx.runCode}-NOSECOND`;
    const created = await createWorkspacePayrollRunAction({}, form({
      projectId: ctx.projectId, code, periodStart: "2026-02-01", periodEnd: "2026-02-28", mechanismVersionId: ctx.mechanismVersionId,
    }));
    expect(created.ok).toBe(true);
    const run = await ctx.prisma.zWorkspacePayrollRun.findFirstOrThrow({ where: { projectId: ctx.projectId, code } });

    // Cưỡng ép thẳng lên APPROVED (bỏ qua second-approve) để kiểm finalize độc lập.
    await ctx.prisma.zWorkspacePayrollRun.update({ where: { id: run.id }, data: { status: "APPROVED", approvedById: ctx.adminId, approvedAt: new Date() } });

    const finalize = await finalizeWorkspacePayrollRunAction({}, form({ projectId: ctx.projectId, runId: run.id, confirmation: "FINALIZE" }));
    expect(finalize.error, "finalize khi chưa đủ 2 người duyệt phải bị từ chối").toBeTruthy();

    await ctx.prisma.zWorkspacePayrollLine.deleteMany({ where: { runId: run.id } });
    await ctx.prisma.zWorkspacePayrollRun.deleteMany({ where: { id: run.id } });
  });
});
