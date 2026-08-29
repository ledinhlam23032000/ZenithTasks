/**
 * Bằng chứng runtime trên dữ liệu nghiệp vụ phòng khám thật: double-submit chi
 * lương KHÔNG được tạo hai phiếu chi cho cùng một người/một tháng.
 *
 * Mô phỏng đúng race thật: gọi payStaffSalary hai lần gần như đồng thời
 * (Promise.all) cho cùng một nhân sự/tháng — giống hai lần bấm nút hoặc
 * double-submit do mạng chậm.
 */
import { describe, expect, it, vi } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const enabled =
  process.env.QA_CONFIRM === "YES" &&
  rawUrl !== "" &&
  /(qa|test|staging)/i.test(rawUrl) &&
  !/(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
if (enabled) process.env.DATABASE_URL = rawUrl;

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
let scenarioAdminId = "";
vi.mock("./auth", () => ({
  requireCap: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe.runIf(enabled)("payStaffSalary chống double-submit trên dữ liệu QA thật", () => {
  it("bấm 2 lần đồng thời cho cùng người/tháng chỉ tạo ĐÚNG 1 phiếu chi", async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_admin_scenario__" },
      update: {},
      create: { username: "__qa_admin_scenario__", fullName: "QA Scenario Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    scenarioAdminId = admin.id;
    const bacsi = await prisma.user.findFirst({ where: { username: "qademo.bacsi" }, select: { id: true } });
    expect(bacsi, "cần chạy seed-clinic-business.ts trước").toBeTruthy();

    const month = "2026-07";
    // Dọn sạch trạng thái trước khi test để không bị ảnh hưởng bởi lần chạy trước.
    const before = await prisma.payrollEntry.findUnique({ where: { userId_month: { userId: bacsi!.id, month } } });
    if (before?.cashTxId) {
      await prisma.cashTransaction.delete({ where: { id: before.cashTxId } }).catch(() => {});
    }
    await prisma.payrollEntry.deleteMany({ where: { userId: bacsi!.id, month } });

    const { payStaffSalary } = await import("../app/(app)/ke-toan/actions");
    const fields = form({ userId: bacsi!.id, month, standardDays: "26" });

    const [r1, r2] = await Promise.all([
      payStaffSalary({}, fields).catch((e) => ({ error: String(e) })),
      payStaffSalary({}, fields).catch((e) => ({ error: String(e) })),
    ]);

    const successes = [r1, r2].filter((r: any) => r.ok).length;
    expect(successes, `chính xác 1 trong 2 lần gọi phải thành công, kết quả: ${JSON.stringify([r1, r2])}`).toBe(1);

    const cashTxCount = await prisma.cashTransaction.count({
      where: { category: "SALARY", vendor: "QA Demo Bác sĩ", note: { contains: "07/2026" } },
    });
    expect(cashTxCount, "phải ĐÚNG 1 phiếu chi lương, không phải 2").toBe(1);

    // dọn dẹp
    const entry = await prisma.payrollEntry.findUnique({ where: { userId_month: { userId: bacsi!.id, month } } });
    if (entry?.cashTxId) await prisma.cashTransaction.delete({ where: { id: entry.cashTxId } }).catch(() => {});
    await prisma.payrollEntry.deleteMany({ where: { userId: bacsi!.id, month } });
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => {});
  });
});
