/**
 * Seed dữ liệu ẢO cho nghiệp vụ phòng khám (khách, hồ sơ, thanh toán, chấm công)
 * trên QA cô lập — để kiểm thử các luồng TIỀN trên dữ liệu giống thật.
 *
 * Vì sao cần: QA trước đây chỉ có dữ liệu lớp đa công ty (ZProject/ZAiAgent...),
 * còn Customer/CaseRecord/Payment/PayrollEntry đều = 0. Nghĩa là các sửa đổi về
 * hoa hồng, chi lương, chốt sổ chưa từng chạy trên bất kỳ dữ liệu nào.
 *
 * KHÁC `prisma/seed.ts`: file đó mở đầu bằng 14 lệnh deleteMany (xem cạm bẫy #11
 * trong BAN-GIAO — từng suýt xoá dữ liệu thật). File này CHỈ upsert/create, không
 * bao giờ xoá, và tự dừng nếu database không mang dấu hiệu QA.
 *
 * Dữ liệu hoàn toàn bịa: tên "QA Demo ...", SĐT 0900xxxxxx. KHÔNG dùng PII thật.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createHash, createCipheriv, randomBytes } from "node:crypto";

const url = process.env.QA_DATABASE_URL ?? "";
if (process.env.QA_CONFIRM !== "YES") throw new Error("Cần QA_CONFIRM=YES.");
if (!url) throw new Error("Cần QA_DATABASE_URL.");
if (!/(qa|test|staging)/i.test(url)) throw new Error("URL không mang dấu hiệu QA/test/staging — từ chối chạy.");
if (/(clinic|production|trungtam|hongphuc)/i.test(url)) throw new Error("URL mang dấu hiệu clinic/production — TỪ CHỐI.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const PREFIX = "QADEMO";
const ENC_KEY = process.env.PHONE_ENC_KEY ?? "";

/** Mã hoá SĐT giả theo đúng cơ chế app (AES-256-GCM); không có khoá thì để chuỗi rõ ràng là giả. */
function encPhone(phone: string) {
  if (ENC_KEY.length < 32) return `QA-FAKE-${phone}`;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", Buffer.from(ENC_KEY.slice(0, 32)), iv);
  const enc = Buffer.concat([c.update(phone, "utf8"), c.final()]);
  return `${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}
const hashPhone = (p: string) => createHash("sha256").update(p).digest("hex");

// bcrypt hash của một mật khẩu QA cố định, KHÔNG phải mật khẩu thật của ai.
// Tài khoản seed đều active=false để không đăng nhập được — chỉ làm dữ liệu tham chiếu.
const INERT_HASH = "$2a$12$3zQfQmJ8kV5oQ0xO7Zx3ye8sRj2yZ0Zl1wKQ8mN4pT6vY9aB2cD3e";

async function staff(username: string, fullName: string, role: "DOCTOR" | "NURSE" | "CONSULTANT", baseSalary: number) {
  return prisma.user.upsert({
    where: { username },
    update: { fullName, role, baseSalary, active: true },
    create: { code: `${PREFIX}-${username}`, username, fullName, role, baseSalary, active: true, passwordHash: INERT_HASH, mustChangePassword: true },
  });
}

async function main() {
  const month = process.env.QA_SEED_MONTH ?? "2026-07";
  const [y, m] = month.split("-").map(Number);

  // --- Nhân sự ---
  const bacsi = await staff("qademo.bacsi", "QA Demo Bác sĩ", "DOCTOR", 10_000_000);
  const dieuduong = await staff("qademo.dieuduong", "QA Demo Điều dưỡng", "NURSE", 8_000_000);
  const tuvan = await staff("qademo.tuvan", "QA Demo Tư vấn", "CONSULTANT", 8_000_000);

  // --- Dịch vụ ---
  const svcA = await prisma.service.upsert({
    where: { id: `${PREFIX}-SVC-A` },
    update: {},
    create: { id: `${PREFIX}-SVC-A`, name: "QA Demo — Dịch vụ có bác sĩ", listPrice: 6_000_000, defaultPrice: 6_000_000, active: true },
  });
  const svcB = await prisma.service.upsert({
    where: { id: `${PREFIX}-SVC-B` },
    update: {},
    create: { id: `${PREFIX}-SVC-B`, name: "QA Demo — Dịch vụ không gắn bác sĩ", listPrice: 4_000_000, defaultPrice: 4_000_000, active: true },
  });

  // --- Khách + hồ sơ: ĐÚNG kịch bản lỗi hoa hồng bác sĩ ---
  // Hồ sơ 10tr = 6tr (bác sĩ A) + 4tr (không gắn ai). Khách trả đủ 10tr.
  // Hoa hồng bác sĩ ĐÚNG phải là 6tr x 8% = 480.000, KHÔNG phải 10tr x 8% = 800.000.
  const phone = "0900000001";
  const cust = await prisma.customer.upsert({
    where: { code: `${PREFIX}-KH001` },
    update: {},
    create: {
      code: `${PREFIX}-KH001`, fullName: "QA Demo Khách Một", phoneEnc: encPhone(phone),
      phoneLast5: phone.slice(-5), phoneHash: hashPhone(phone), source: "OTHER",
    },
  });

  const caseCode = `${PREFIX}-HS001`;
  let rec = await prisma.caseRecord.findUnique({ where: { code: caseCode } });
  if (!rec) {
    // Một transaction: nếu bước nào lỗi giữa chừng, KHÔNG để lại CaseRecord mồ côi
    // thiếu CaseService/Payment (rơi đúng bẫy: lần chạy sau thấy code đã tồn tại
    // nên bỏ qua toàn bộ phần còn lại, và bài kiểm hoa hồng chạy trên dữ liệu rỗng).
    rec = await prisma.$transaction(async (tx) => {
      const created = await tx.caseRecord.create({
        data: {
          code: caseCode, customerId: cust.id, consultantId: tuvan.id, doctorId: bacsi.id,
          status: "COMPLETED", consultResult: "AGREED",
          totalAmount: 10_000_000, paidAmount: 10_000_000, debtAmount: 0,
          createdAt: new Date(y, m - 1, 5), completedAt: new Date(y, m - 1, 6),
        },
      });
      await tx.caseService.createMany({
        data: [
          { caseId: created.id, serviceId: svcA.id, name: svcA.name, listPrice: 6_000_000, unitPrice: 6_000_000, quantity: 1, discount: 0, finalPrice: 6_000_000, doctorId: bacsi.id, nurseId: dieuduong.id },
          // CỐ Ý không gắn doctorId — đây là dòng từng bị "hút" vào căn cứ hoa hồng bác sĩ.
          { caseId: created.id, serviceId: svcB.id, name: svcB.name, listPrice: 4_000_000, unitPrice: 4_000_000, quantity: 1, discount: 0, finalPrice: 4_000_000 },
        ],
      });
      await tx.payment.create({
        data: { caseId: created.id, amount: 10_000_000, method: "CASH", paidAt: new Date(y, m - 1, 6), receivedById: tuvan.id, clientNonce: `${PREFIX}-PAY001` },
      });
      return created;
    });
  }

  // --- Chấm công: đủ ngày để lương cứng có giá trị ---
  for (const u of [bacsi, dieuduong, tuvan]) {
    for (let d = 1; d <= 26; d++) {
      const date = new Date(Date.UTC(y, m - 1, d));
      const existed = await prisma.attendance.findFirst({ where: { userId: u.id, date } });
      if (!existed) await prisma.attendance.create({ data: { userId: u.id, date } });
    }
  }

  const summary = {
    ok: true,
    qaOnly: true,
    month,
    users: [bacsi.username, dieuduong.username, tuvan.username],
    caseCode,
    caseTotal: 10_000_000,
    doctorServiceRevenue: 6_000_000,
    unassignedServiceRevenue: 4_000_000,
    expectedDoctorCommission: 480_000,
    note: "Chỉ thêm dữ liệu, không xoá gì. Tài khoản seed active nhưng dùng hash trơ, không đăng nhập được bằng mật khẩu đã biết.",
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().finally(() => prisma.$disconnect());
