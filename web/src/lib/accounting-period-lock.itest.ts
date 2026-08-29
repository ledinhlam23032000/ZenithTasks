/**
 * Bằng chứng runtime cho 2 lỗ hổng khoá kỳ kế toán, trên dữ liệu QA thật:
 *
 * 1) Chốt sổ không đóng băng số liệu hiển thị — `getMonthlyAccounting` luôn trả
 *    số LIVE, `AccountingPeriod` chỉ dùng để hiện nhãn "Đã chốt sổ". Sửa chấm
 *    công/hoa hồng của tháng đã chốt làm số hiển thị đổi âm thầm dù nhãn không đổi.
 *    -> Test: `periodDrift.hasDrift` phải bật lên khi số live khác snapshot.
 *
 * 2) `bulkUpsertAttendance`/`upsertAttendance`/`deleteAttendance` và
 *    `updateCaseInfo` (commissionAmount) không kiểm tháng đã chốt sổ trước khi ghi.
 *    -> Test: ghi vào tháng đã chốt phải bị TỪ CHỐI, không âm thầm thành công.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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
  requireUser: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
  requireCap: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const LOCK_MONTH = "2026-01"; // tháng riêng cho bài test này, không đụng seed nghiệp vụ chính (2026-07).

type Ctx = { prisma: typeof import("./db").prisma; adminId: string; bacsiId: string; caseId: string };
let ctx: Ctx;

describe.runIf(enabled)("Khoá kỳ kế toán trên dữ liệu QA thật", () => {
  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_period_lock_admin__" },
      update: {},
      create: { username: "__qa_period_lock_admin__", fullName: "QA Period Lock Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    scenarioAdminId = admin.id;
    const bacsi = await prisma.user.findFirst({ where: { username: "qademo.bacsi" }, select: { id: true } });
    expect(bacsi, "cần chạy seed-clinic-business.ts trước").toBeTruthy();

    // Hồ sơ riêng trong tháng LOCK_MONTH để không đụng hồ sơ seed chính.
    // source=COLLABORATOR: commissionAmount của hồ sơ này mới cộng vào ctvPayable
    // (xem payroll.ts — chỉ gom hồ sơ có customer.source==="COLLABORATOR" vào ctv[]),
    // và ctvPayable mới là thứ chảy vào pnl.ctvCommission mà periodDrift so sánh.
    const cust = await prisma.customer.upsert({
      where: { code: "QADEMO-KH-LOCK" },
      update: {},
      create: { code: "QADEMO-KH-LOCK", fullName: "QA Demo Khách Lock", phoneEnc: "QA-FAKE-0900000099", phoneLast5: "00099", phoneHash: "qa-lock-hash", source: "COLLABORATOR", sourceDetail: "QA Demo CTV" },
    });
    // Sạch trạng thái trước khi test: chốt sổ tháng LOCK_MONTH có thể còn sót từ
    // lần chạy trước bị ngắt giữa chừng, và commissionAmount có thể đã bị đổi.
    await prisma.accountingPeriod.deleteMany({ where: { month: LOCK_MONTH } });
    const rec = await prisma.caseRecord.upsert({
      where: { code: "QADEMO-HS-LOCK" },
      update: { commissionAmount: 100_000 },
      create: { code: "QADEMO-HS-LOCK", customerId: cust.id, doctorId: bacsi!.id, status: "COMPLETED", totalAmount: 1_000_000, paidAmount: 1_000_000, commissionAmount: 100_000, createdAt: new Date(`${LOCK_MONTH}-10T00:00:00.000Z`) },
    });
    ctx = { prisma, adminId: admin.id, bacsiId: bacsi!.id, caseId: rec.id };
  });

  afterAll(async () => {
    if (!ctx?.prisma) return;
    await ctx.prisma.accountingPeriod.deleteMany({ where: { month: LOCK_MONTH } });
    await ctx.prisma.attendance.deleteMany({ where: { userId: ctx.bacsiId, date: { gte: new Date(`${LOCK_MONTH}-01`), lt: new Date("2026-02-01") } } });
  });

  it("chốt sổ rồi sửa hoa hồng CTV của hồ sơ trong tháng đó -> bị TỪ CHỐI", async () => {
    const { getMonthlyAccounting, isMonthClosed } = await import("./accounting");
    const { closePeriod } = await import("../app/(app)/ke-toan/actions");
    const { updateCaseInfo } = await import("../app/(app)/ho-so/actions");

    const monthDate = new Date(`${LOCK_MONTH}-01T00:00:00.000Z`);
    expect(await isMonthClosed(LOCK_MONTH)).toBe(false);

    const closeRes = await closePeriod({}, form({ month: LOCK_MONTH, standardDays: "26" }));
    expect(closeRes.ok, `closePeriod phải thành công: ${JSON.stringify(closeRes)}`).toBe(true);
    expect(await isMonthClosed(LOCK_MONTH)).toBe(true);

    // Lỗ hổng #2: sửa commissionAmount của hồ sơ trong tháng đã chốt phải bị chặn.
    const res = await updateCaseInfo({}, form({
      caseId: ctx.caseId, status: "COMPLETED", consultResult: "AGREED",
      commissionAmount: "999999999", chiefComplaint: "", note: "",
    }));
    expect(res.error, "sửa hoa hồng CTV của tháng đã chốt sổ phải bị từ chối").toBeTruthy();
    expect(res.error).toMatch(/chốt sổ/);

    const stillOld = await ctx.prisma.caseRecord.findUnique({ where: { id: ctx.caseId }, select: { commissionAmount: true } });
    expect(Number(stillOld?.commissionAmount)).toBe(100_000);

    // Lỗ hổng #1: nếu ta bịa cách khác để đổi số (giả lập ai đó sửa qua đường khác),
    // trang phải cảnh báo lệch — dùng trực tiếp update DB để mô phỏng "kênh khác".
    await ctx.prisma.caseRecord.update({ where: { id: ctx.caseId }, data: { commissionAmount: 500_000 } });
    const after = await getMonthlyAccounting(monthDate, 26);
    expect(after.periodDrift?.hasDrift, "phải phát hiện số live khác snapshot đã chốt").toBe(true);
    // dọn lại đúng số ban đầu
    await ctx.prisma.caseRecord.update({ where: { id: ctx.caseId }, data: { commissionAmount: 100_000 } });
  });

  it("chấm công vào tháng đã chốt sổ -> bị TỪ CHỐI ở cả 3 action", async () => {
    expect(await (await import("./accounting")).isMonthClosed(LOCK_MONTH)).toBe(true);
    const { upsertAttendance, bulkUpsertAttendance, deleteAttendance } = await import("../app/(app)/cham-cong/actions");

    const single = await upsertAttendance({}, form({ userId: ctx.bacsiId, date: `${LOCK_MONTH}-15`, checkIn: "08:00", checkOut: "17:00" }));
    expect(single.error, "upsertAttendance vào tháng đã chốt phải bị chặn").toBeTruthy();

    const bulk = await bulkUpsertAttendance({}, form({
      userId: ctx.bacsiId, dates: JSON.stringify([`${LOCK_MONTH}-16`]), checkIn: "08:00", checkOut: "17:00",
    }));
    expect(bulk.error, "bulkUpsertAttendance vào tháng đã chốt phải bị chặn").toBeTruthy();

    const count = await ctx.prisma.attendance.count({ where: { userId: ctx.bacsiId, date: { gte: new Date(`${LOCK_MONTH}-01`), lt: new Date("2026-02-01") } } });
    expect(count, "không được tạo bản ghi chấm công nào trong tháng đã chốt").toBe(0);

    // Tạo một bản ghi TRỰC TIẾP (mô phỏng dữ liệu có sẵn từ trước khi chốt sổ), rồi
    // xác nhận deleteAttendance từ chối xoá nó sau khi tháng đã chốt.
    const seeded = await ctx.prisma.attendance.create({ data: { userId: ctx.bacsiId, date: new Date(`${LOCK_MONTH}-20T00:00:00.000Z`) } });
    const del = await deleteAttendance(form({ id: seeded.id }));
    expect(del).toBeUndefined(); // hàm void, không throw
    const stillThere = await ctx.prisma.attendance.findUnique({ where: { id: seeded.id } });
    expect(stillThere, "deleteAttendance không được xoá bản ghi của tháng đã chốt").toBeTruthy();
  });
});
