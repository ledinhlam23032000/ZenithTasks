/**
 * MC-15 / P0-hoa-hồng — Bằng chứng runtime trên dữ liệu nghiệp vụ phòng khám thật.
 *
 * Gọi thẳng `getCommissionForMonth` (hàm production thật, cùng hàm mà `/luong` gọi)
 * trên dữ liệu do `scripts/qa/seed-clinic-business.ts` tạo: hồ sơ 10tr = 6tr dịch vụ
 * có bác sĩ + 4tr không gắn ai, khách trả đủ 10tr.
 *
 * Trước fix: hoa hồng bác sĩ = 10.000.000 x 8% = 800.000 (sai, hút cả phần không
 * gắn ai). Sau fix: phải đúng 6.000.000 x 8% = 480.000.
 */
import { describe, expect, it } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const enabled =
  process.env.QA_CONFIRM === "YES" &&
  rawUrl !== "" &&
  /(qa|test|staging)/i.test(rawUrl) &&
  !/(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
if (enabled) process.env.DATABASE_URL = rawUrl;

describe.runIf(enabled)("Hoa hồng bác sĩ trên dữ liệu QA thật (hồ sơ 6tr+4tr, trả đủ 10tr)", () => {
  it("căn cứ hoa hồng bác sĩ = 6.000.000, KHÔNG phải 10.000.000", async () => {
    const { prisma } = await import("./db");
    const { getCommissionForMonth } = await import("./commission-data");

    const bacsi = await prisma.user.findFirst({ where: { username: "qademo.bacsi" }, select: { id: true } });
    expect(bacsi, "cần chạy seed-clinic-business.ts trước").toBeTruthy();

    const result = await getCommissionForMonth(new Date("2026-07-15"));
    const mine = result.get(bacsi!.id);
    expect(mine, "phải có kết quả hoa hồng cho bác sĩ demo").toBeTruthy();

    const doctorServiceDetail = mine!.details.filter((d) => d.role === "doctor-service");
    const totalBase = doctorServiceDetail.reduce((s, d) => s + d.base, 0);
    const totalCommission = doctorServiceDetail.reduce((s, d) => s + d.amount, 0);

    expect(totalBase, "căn cứ hoa hồng dịch vụ bác sĩ").toBe(6_000_000);
    expect(totalCommission, "hoa hồng dịch vụ bác sĩ = 6tr x 8%").toBe(480_000);
    // Chứng minh KHÔNG còn hút phần 4tr không gắn ai (giá trị lỗi cũ).
    expect(totalBase).not.toBe(10_000_000);
    expect(totalCommission).not.toBe(800_000);
  });
});
