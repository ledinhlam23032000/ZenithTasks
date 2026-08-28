/**
 * MC-13.1 — Bằng chứng runtime: server action TỪ CHỐI ghi nghiệp vụ vào company
 * DRAFT/ARCHIVED và vào company mà người dùng không có membership.
 *
 * Vì sao tồn tại file này: harness HTTP cũ (`scripts/qa/write-denial-walkthrough.mjs`)
 * POST FormData trần vào một server action có chữ ký `(prevState, formData)` kiểu
 * useActionState. Next truyền FormData vào `prevState`, `formData` thành `undefined`,
 * nên action ném TypeError → HTTP 500 TRƯỚC KHI chạm guard. Evidence khi đó ghi
 * "không có bản ghi nào được tạo" nhưng lý do là action crash, KHÔNG phải guard chặn.
 * Test này gọi action đúng chữ ký nên đo đúng thứ cần đo.
 *
 * An toàn: chỉ chạy khi có QA_CONFIRM=YES và DB URL mang dấu hiệu QA/test/staging và
 * KHÔNG mang dấu hiệu clinic/production. Thiếu điều kiện thì skip, không bao giờ tự
 * chuyển sang database khác.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const looksQa = /(qa|test|staging)/i.test(rawUrl);
const looksClinic = /(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
const enabled = process.env.QA_CONFIRM === "YES" && rawUrl !== "" && looksQa && !looksClinic;

if (enabled) {
  process.env.DATABASE_URL = rawUrl;
  process.env.ENABLE_ZENITH_V2 = "true";
}

class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT:${to}`);
    this.name = "RedirectError";
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let currentUser: { id: string; role: string } | null = null;
vi.mock("./auth", () => ({
  requireUser: async () => {
    if (!currentUser) throw new RedirectError("/login");
    return currentUser;
  },
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

type Ctx = {
  prisma: typeof import("./db").prisma;
  createCustomer: typeof import("./v2-customer-actions").createWorkspaceCustomerAction;
  createTask: typeof import("./v2-task-actions").createWorkspaceTaskAction;
  draftId: string;
  archivedId: string;
  activeA: string;
  activeB: string;
  adminId: string;
  salesAId: string;
};
let ctx: Ctx;

async function countRows(prisma: Ctx["prisma"], projectId: string) {
  const [customers, tasks] = await Promise.all([
    prisma.zWorkspaceCustomer.count({ where: { projectId } }),
    prisma.zWorkspaceTask.count({ where: { projectId } }),
  ]);
  return { customers, tasks };
}

describe.runIf(enabled)("MC-13.1 lifecycle & tenant write denial (QA database)", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const { createWorkspaceCustomerAction } = await import("./v2-customer-actions");
    const { createWorkspaceTaskAction } = await import("./v2-task-actions");

    const projects = await prisma.zProject.findMany({ select: { id: true, code: true, status: true } });
    const byStatus = (s: string) => projects.filter((p) => p.status === s);
    const actives = byStatus("ACTIVE");
    const draft = byStatus("DRAFT")[0];
    const archived = byStatus("ARCHIVED")[0];
    expect(draft, "QA fixture cần 1 company DRAFT").toBeTruthy();
    expect(archived, "QA fixture cần 1 company ARCHIVED").toBeTruthy();
    expect(actives.length, "QA fixture cần >=2 company ACTIVE").toBeGreaterThanOrEqual(2);

    const admin = await prisma.user.findFirst({ where: { username: "admin" }, select: { id: true } });
    const salesA = await prisma.user.findFirst({ where: { username: "sales" }, select: { id: true } });
    expect(admin, "QA fixture cần user 'admin'").toBeTruthy();
    expect(salesA, "QA fixture cần user 'sales'").toBeTruthy();

    const salesMembership = await prisma.zProjectMember.findFirst({
      where: { userId: salesA!.id, active: true },
      select: { projectId: true },
    });
    expect(salesMembership, "user 'sales' cần membership active").toBeTruthy();
    const activeA = salesMembership!.projectId;
    const activeB = actives.find((p) => p.id !== activeA)!.id;

    ctx = {
      prisma,
      createCustomer: createWorkspaceCustomerAction,
      createTask: createWorkspaceTaskAction,
      draftId: draft!.id,
      archivedId: archived!.id,
      activeA,
      activeB,
      adminId: admin!.id,
      salesAId: salesA!.id,
    };
  });

  it("ADMIN không thể tạo khách hàng trong company DRAFT", async () => {
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const before = await countRows(ctx.prisma, ctx.draftId);
    await expect(
      ctx.createCustomer({}, form({ projectId: ctx.draftId, code: "QA-DENY-DRAFT", fullName: "Synthetic Draft" })),
    ).rejects.toThrow(/REDIRECT:\/khong-co-quyen/);
    expect(await countRows(ctx.prisma, ctx.draftId)).toEqual(before);
  });

  it("ADMIN không thể tạo công việc trong company ARCHIVED", async () => {
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const before = await countRows(ctx.prisma, ctx.archivedId);
    await expect(
      ctx.createTask({}, form({ projectId: ctx.archivedId, title: "Synthetic Archived", priority: "NORMAL" })),
    ).rejects.toThrow(/REDIRECT:\/khong-co-quyen/);
    expect(await countRows(ctx.prisma, ctx.archivedId)).toEqual(before);
  });

  it("thành viên company A không thể ghi sang company B", async () => {
    currentUser = { id: ctx.salesAId, role: "STAFF" };
    const before = await countRows(ctx.prisma, ctx.activeB);
    await expect(
      ctx.createCustomer({}, form({ projectId: ctx.activeB, code: "QA-DENY-CROSS", fullName: "Synthetic Cross" })),
    ).rejects.toThrow(/REDIRECT:\/khong-co-quyen/);
    expect(await countRows(ctx.prisma, ctx.activeB)).toEqual(before);
  });

  it("người bị thu hồi membership không thể ghi vào company cũ", async () => {
    const revoked = await ctx.prisma.user.findFirst({ where: { username: "revoked" }, select: { id: true } });
    expect(revoked, "QA fixture cần user 'revoked'").toBeTruthy();
    currentUser = { id: revoked!.id, role: "STAFF" };
    const before = await countRows(ctx.prisma, ctx.activeA);
    await expect(
      ctx.createCustomer({}, form({ projectId: ctx.activeA, code: "QA-DENY-REVOKED", fullName: "Synthetic Revoked" })),
    ).rejects.toThrow(/REDIRECT:\/khong-co-quyen/);
    expect(await countRows(ctx.prisma, ctx.activeA)).toEqual(before);
  });

  it("control: ADMIN VẪN ghi được vào company ACTIVE (guard không chặn nhầm)", async () => {
    currentUser = { id: ctx.adminId, role: "ADMIN" };
    const code = "QA-CONTROL-OK";
    await ctx.prisma.zWorkspaceCustomer.deleteMany({ where: { projectId: ctx.activeA, code } });
    const before = await countRows(ctx.prisma, ctx.activeA);
    const result = await ctx.createCustomer({}, form({ projectId: ctx.activeA, code, fullName: "Synthetic Control" }));
    expect(result.ok, `expected success, got: ${JSON.stringify(result)}`).toBe(true);
    expect((await countRows(ctx.prisma, ctx.activeA)).customers).toBe(before.customers + 1);
    await ctx.prisma.zWorkspaceCustomer.deleteMany({ where: { projectId: ctx.activeA, code } });
  });
});
