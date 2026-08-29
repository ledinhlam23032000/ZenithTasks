/**
 * MC-21 — Bằng chứng runtime cho two-person approval THẬT trên hành động L5
 * duy nhất còn khả dụng qua AI dispatcher legacy (delete_customer). Trước đây
 * governanceBlock chặn cứng hoàn toàn requiredApprovals>1 — không tạo được
 * preview, không ai dùng được. Chứng minh trên QA thật: PENDING -> (người 1
 * xác nhận) -> PENDING_SECOND (KHÔNG xóa) -> (chính người 1 tự duyệt lần 2 bị
 * từ chối) -> (người 2 khác xác nhận) -> Customer bị xóa thật.
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
}

let scenarioUserId = "";
vi.mock("@/lib/auth", () => ({
  requireCap: async () => ({ id: scenarioUserId, role: "ADMIN" }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const CODE_PREFIX = "ITEST-2P-";

type Ctx = {
  prisma: typeof import("@/lib/db").prisma;
  adminAId: string;
  adminBId: string;
  customerId: string;
  customerCode: string;
};
let ctx: Ctx;

describe.runIf(enabled)("MC-21 two-person approval cho delete_customer (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const adminA = await prisma.user.upsert({
      where: { username: "__qa_2p_admin_a__" }, update: {},
      create: { username: "__qa_2p_admin_a__", fullName: "QA 2P Admin A", role: "ADMIN", passwordHash: "x", active: true },
    });
    const adminB = await prisma.user.upsert({
      where: { username: "__qa_2p_admin_b__" }, update: {},
      create: { username: "__qa_2p_admin_b__", fullName: "QA 2P Admin B", role: "ADMIN", passwordHash: "x", active: true },
    });
    const code = `${CODE_PREFIX}${Date.now()}`;
    const customer = await prisma.customer.create({
      data: { code, fullName: "Khách hàng ITest 2P", phoneEnc: "x", phoneLast5: "00000", phoneHash: `${code}-hash`, source: "OTHER" },
    });
    ctx = { prisma, adminAId: adminA.id, adminBId: adminB.id, customerId: customer.id, customerCode: customer.code };
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    await ctx.prisma.customer.deleteMany({ where: { code: ctx.customerCode } });
    await ctx.prisma.assistantApproval.deleteMany({ where: { arguments: { path: ["customerCode"], equals: ctx.customerCode } } });
  });

  it("chuỗi đầy đủ: PENDING -> xác nhận 1 -> PENDING_SECOND (chưa xóa) -> tự duyệt lần 2 bị từ chối -> người khác duyệt -> xóa thật", async () => {
    const { prisma } = ctx;
    const approval = await prisma.assistantApproval.create({
      data: {
        userId: ctx.adminAId,
        toolName: "delete_customer",
        arguments: { customerId: ctx.customerId, customerCode: ctx.customerCode, resolvedName: "Khách hàng ITest 2P", purpose: "Kiểm chứng MC-21: khách trùng hồ sơ do lỗi nhập liệu itest" },
        preview: `XÓA VĨNH VIỄN hồ sơ Khách hàng ITest 2P (${ctx.customerCode})`,
        workspaceKind: "INTERNAL",
        expiresAt: new Date(Date.now() + 10 * 60_000),
        status: "PENDING",
      },
    });

    const { confirmAssistantApproval } = await import("./agent");

    // Bước 1: adminA xác nhận lần đầu.
    scenarioUserId = ctx.adminAId;
    const first = await confirmAssistantApproval({}, form({ approvalId: approval.id }));
    expect(first.error, `xác nhận lần 1 không được lỗi: ${JSON.stringify(first)}`).toBeUndefined();
    expect(first.answer, "phải báo rõ cần người thứ 2").toContain("ADMIN KHÁC");

    const afterFirst = await prisma.assistantApproval.findUniqueOrThrow({ where: { id: approval.id } });
    expect(afterFirst.status, "phải chuyển PENDING_SECOND, KHÔNG được APPROVED thẳng").toBe("PENDING_SECOND");
    expect(afterFirst.firstApprovedById).toBe(ctx.adminAId);

    const stillExists = await prisma.customer.findUnique({ where: { id: ctx.customerId } });
    expect(stillExists, "khách hàng KHÔNG được xóa trước khi có người thứ 2 duyệt").toBeTruthy();

    // Bước 2: chính adminA tự duyệt lần 2 — phải bị từ chối.
    const selfSecond = await confirmAssistantApproval({}, form({ approvalId: approval.id }));
    expect(selfSecond.error, "cùng 1 người không được tự duyệt cả 2 lần").toBeTruthy();
    const stillExists2 = await prisma.customer.findUnique({ where: { id: ctx.customerId } });
    expect(stillExists2, "khách hàng vẫn phải còn nguyên sau khi tự-duyệt-lần-2 bị chặn").toBeTruthy();

    // Bước 3: adminB (người khác) xác nhận lần 2 -> thực thi thật.
    scenarioUserId = ctx.adminBId;
    const second = await confirmAssistantApproval({}, form({ approvalId: approval.id }));
    expect(second.error, `xác nhận lần 2 bởi người khác phải thành công: ${JSON.stringify(second)}`).toBeUndefined();

    const finalApproval = await prisma.assistantApproval.findUniqueOrThrow({ where: { id: approval.id } });
    expect(finalApproval.status).toBe("APPROVED");

    const deleted = await prisma.customer.findUnique({ where: { id: ctx.customerId } });
    expect(deleted, "AI Tổng phải THỰC SỰ xóa khách hàng sau khi đủ 2 người duyệt").toBeNull();

    const audits = await prisma.auditLog.findMany({ where: { entityId: ctx.customerId, action: "DELETE_CUSTOMER" } });
    expect(audits.length, "phải có audit trail cho việc xóa thật").toBeGreaterThan(0);
  });
});
