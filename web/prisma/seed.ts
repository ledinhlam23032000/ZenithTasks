import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Service, Material, Customer } from "../src/generated/prisma/client";
import { encryptPhone, phoneLast5, hashPhone } from "../src/lib/phone";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---- tiện ích thời gian ----
const now = new Date();
function at(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function daysAgo(n: number, hour = 10): Date {
  return at(-n, hour);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DEMO_PASSWORD = "123456";

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu...");

  // Dọn dữ liệu cũ (theo thứ tự phụ thuộc khoá ngoại)
  await prisma.auditLog.deleteMany();
  await prisma.careMessage.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.materialUsage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.caseService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.caseRecord.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.material.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const pw = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- NHÂN SỰ ----
  const usersData = [
    { code: "NV001", username: "admin", fullName: "Trần Quản Trị", role: "ADMIN" as const },
    { code: "NV002", username: "quanly", fullName: "Lê Thị Quản Lý", role: "MANAGER" as const },
    { code: "NV003", username: "telesale", fullName: "Phạm Thu Tiếp Nhận", role: "TELESALE" as const },
    { code: "NV004", username: "letan", fullName: "Nguyễn Thị Lễ Tân", role: "RECEPTION" as const },
    { code: "NV005", username: "tuvan1", fullName: "Vũ Minh Tư Vấn", role: "CONSULTANT" as const },
    { code: "NV006", username: "tuvan2", fullName: "Đỗ Lan Tư Vấn", role: "CONSULTANT" as const },
    { code: "NV007", username: "bacsi1", fullName: "BS. Hoàng Hồng Phúc", role: "DOCTOR" as const },
    { code: "NV008", username: "bacsi2", fullName: "BS. Trần An Khang", role: "DOCTOR" as const },
    { code: "NV009", username: "cskh", fullName: "Mai Thị Chăm Sóc", role: "CARE" as const },
  ];
  const users: Record<string, string> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: { ...u, passwordHash: pw, phone: "0900000000", mustChangePassword: true },
    });
    users[u.username] = created.id;
  }
  const consultants = [users.tuvan1, users.tuvan2];
  const doctors = [users.bacsi1, users.bacsi2];
  console.log(`  ✓ ${usersData.length} nhân sự`);

  // ---- DỊCH VỤ ----
  const servicesData = [
    { name: "Tiêm filler má baby", category: "Tiêm chất làm đầy", defaultPrice: 8_000_000 },
    { name: "Tiêm botox thon gọn hàm", category: "Tiêm botox", defaultPrice: 6_000_000 },
    { name: "Nâng mũi cấu trúc S-line", category: "Phẫu thuật", defaultPrice: 35_000_000 },
    { name: "Cắt mí mắt Hàn Quốc", category: "Phẫu thuật", defaultPrice: 12_000_000 },
    { name: "Căng da mặt chỉ Collagen", category: "Trẻ hoá", defaultPrice: 25_000_000 },
    { name: "Điều trị nám bằng Laser", category: "Da liễu", defaultPrice: 3_500_000 },
    { name: "Phun xăm chân mày", category: "Phun xăm", defaultPrice: 4_000_000 },
    { name: "Gói chăm sóc da chuyên sâu", category: "Da liễu", defaultPrice: 1_500_000 },
    { name: "Triệt lông công nghệ Diode", category: "Da liễu", defaultPrice: 2_000_000 },
    { name: "Tiêm Meso trẻ hoá da", category: "Trẻ hoá", defaultPrice: 5_000_000 },
  ];
  const services: Service[] = [];
  for (const s of servicesData) {
    services.push(await prisma.service.create({ data: s }));
  }
  console.log(`  ✓ ${services.length} dịch vụ`);

  // ---- VẬT TƯ ----
  const materialsData = [
    { name: "Filler Juvederm Voluma", unit: "syringe" },
    { name: "Botox Allergan 100UI", unit: "lọ" },
    { name: "Chỉ Collagen PDO", unit: "sợi" },
    { name: "Thuốc tê Lidocaine", unit: "ống" },
    { name: "Kim tiêm vô khuẩn 30G", unit: "cái" },
    { name: "Gạc y tế tiệt trùng", unit: "gói" },
    { name: "Mặt nạ dưỡng phục hồi", unit: "miếng" },
  ];
  const materials: Material[] = [];
  for (const m of materialsData) {
    materials.push(await prisma.material.create({ data: m }));
  }
  console.log(`  ✓ ${materials.length} vật tư`);

  // ---- KHÁCH HÀNG ----
  const firstNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  // Tách riêng tên đệm+tên theo giới tính (khớp quy ước tiếng Việt) — GIỚI TÍNH chọn trước,
  // TÊN chọn theo đúng giới tính đó (trước đây random độc lập → sinh dữ liệu sai kiểu
  // "Lê Thị Hương — Nam", trông thiếu chỉn chu khi demo).
  const midLastFemale = ["Thị Mai", "Thị Hương", "Ngọc Anh", "Thu Hà", "Khánh Linh", "Phương Thảo", "Minh Châu", "Thuý Vân", "Hải Yến", "Bích Ngọc", "Quỳnh Như", "Diễm My", "Thanh Tâm", "Kim Chi"];
  const midLastMale = ["Văn Hùng", "Minh Tuấn", "Anh Khoa", "Đình Phúc", "Quang Huy", "Thành Đạt", "Hữu Nghĩa", "Việt Anh", "Xuân Trường", "Công Danh", "Bảo Long", "Đức Thịnh"];
  const sources = ["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK"] as const;
  const sourceDetails: Record<string, string[]> = {
    MARKETING: ["Chiến dịch Hè 2026", "Google Ads", "Quảng cáo Facebook"],
    COLLABORATOR: ["CTV Ngọc Hân", "CTV Bảo Trâm", "CTV Mỹ Linh"],
    REFERRAL: ["KH cũ giới thiệu", "Người thân"],
    FACEBOOK: ["Fanpage chính", "Livestream"],
    ZALO: ["Zalo OA"],
    TIKTOK: ["TikTok Shop", "Video viral"],
    HOTLINE: ["Tổng đài 1900"],
    WALK_IN: ["Khách tự đến"],
  };

  const customers: Customer[] = [];
  for (let i = 0; i < 16; i++) {
    // Đa số khách nữ (khớp thực tế phòng khám thẩm mỹ) — chọn GIỚI TÍNH trước rồi mới
    // chọn tên đúng giới tính đó, không random độc lập (xem chú thích ở khai báo danh sách).
    const gender: "FEMALE" | "MALE" = Math.random() > 0.2 ? "FEMALE" : "MALE";
    const fullName = `${pick(firstNames)} ${pick(gender === "FEMALE" ? midLastFemale : midLastMale)}`;
    // SĐT giả: 09xxxxxxxx
    const phone = "09" + Math.floor(10000000 + Math.random() * 89999999).toString();
    const src = pick([...sources]);
    const c = await prisma.customer.create({
      data: {
        code: `KH${String(i + 1).padStart(5, "0")}`,
        fullName,
        gender,
        dob: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27)),
        phoneEnc: encryptPhone(phone),
        phoneLast5: phoneLast5(phone),
        phoneHash: hashPhone(phone),
        source: src,
        sourceDetail: pick(sourceDetails[src] ?? ["Khác"]),
        createdById: users.letan,
        createdAt: daysAgo(Math.floor(Math.random() * 50)),
      },
    });
    customers.push(c);
  }
  console.log(`  ✓ ${customers.length} khách hàng`);

  // ---- LỊCH HẸN: hôm nay & ngày mai (yêu cầu số 1) ----
  const apptStatusesToday = ["ARRIVED", "IN_CONSULT", "DONE", "DONE", "BOOKED", "CANCELLED", "NO_SHOW"] as const;
  let apptCount = 0;
  // Hôm nay
  for (let i = 0; i < 7; i++) {
    const c = pick(customers);
    await prisma.appointment.create({
      data: {
        customerId: c.id,
        guestName: c.fullName,
        phoneLast5: c.phoneLast5,
        type: Math.random() > 0.7 ? "FOLLOW_UP" : "NEW",
        status: apptStatusesToday[i % apptStatusesToday.length],
        scheduledAt: at(0, 8 + i, (i % 2) * 30),
        serviceInterest: pick(services).name,
        source: c.source,
        createdById: Math.random() > 0.5 ? users.telesale : users.letan,
        consultantId: pick(consultants),
      },
    });
    apptCount++;
  }
  // Ngày mai (đã đặt) — yêu cầu số 1: "mai sẽ đến mấy người, giờ nào, dịch vụ gì"
  for (let i = 0; i < 6; i++) {
    const c = pick(customers);
    await prisma.appointment.create({
      data: {
        customerId: c.id,
        guestName: c.fullName,
        phoneLast5: c.phoneLast5,
        type: "NEW",
        status: i === 5 ? "CONFIRMED" : "BOOKED",
        scheduledAt: at(1, 9 + i, (i % 2) * 30),
        serviceInterest: pick(services).name,
        source: c.source,
        sourceDetail: c.sourceDetail,
        createdById: users.telesale,
      },
    });
    apptCount++;
  }
  // Vài lịch các ngày tới
  for (let d = 2; d <= 4; d++) {
    for (let i = 0; i < 3; i++) {
      const c = pick(customers);
      await prisma.appointment.create({
        data: {
          customerId: c.id,
          guestName: c.fullName,
          phoneLast5: c.phoneLast5,
          status: "BOOKED",
          scheduledAt: at(d, 9 + i * 2),
          serviceInterest: pick(services).name,
          source: c.source,
          createdById: users.telesale,
        },
      });
      apptCount++;
    }
  }
  console.log(`  ✓ ${apptCount} lịch hẹn`);

  // ---- HỒ SƠ ĐIỀU TRỊ (rải tháng này & tháng trước để so sánh tăng trưởng) ----
  const consultResults = ["AGREED", "AGREED", "AGREED", "CONSIDERING", "DECLINED"] as const;
  let caseCount = 0;
  let caseSeq = 0;

  async function makeCase(createdAt: Date) {
    caseSeq++;
    const customer = pick(customers);
    const consultantId = pick(consultants);
    const doctorId = pick(doctors);
    const result = pick([...consultResults]);
    const agreed = result === "AGREED";

    // Chọn 1-3 dịch vụ
    const n = 1 + Math.floor(Math.random() * 3);
    const chosen: typeof services = [];
    for (let k = 0; k < n; k++) chosen.push(pick(services));

    let total = 0;
    const caseServicesData = chosen.map((s) => {
      const unitPrice = Number(s.defaultPrice);
      const discount = Math.random() > 0.6 ? Math.round(unitPrice * 0.1) : 0;
      const finalPrice = unitPrice - discount;
      total += finalPrice;
      return {
        serviceId: s.id,
        name: s.name,
        unitPrice,
        quantity: 1,
        discount,
        finalPrice,
        doctorId,
        performedAt: agreed ? createdAt : null,
      };
    });

    // Thanh toán: nếu chốt thì trả 60-100%
    const payRatio = agreed ? pick([1, 1, 0.7, 0.5]) : 0;
    const paid = Math.round(total * payRatio);
    const debt = agreed ? total - paid : 0;
    const status = agreed ? (payRatio >= 1 ? "COMPLETED" : "SERVICED") : "CONSULTED";

    const caseRecord = await prisma.caseRecord.create({
      data: {
        code: `HS${String(caseSeq).padStart(5, "0")}`,
        customerId: customer.id,
        consultantId,
        doctorId: agreed ? doctorId : null,
        status,
        consultResult: result,
        chiefComplaint: `Khách quan tâm ${chosen[0].name.toLowerCase()}`,
        totalAmount: agreed ? total : 0,
        // CHỈ tính khi thực sự có dịch vụ được tạo (agreed) — nếu không, discountAmount
        // "mồ côi" (không khớp dịch vụ nào) làm thẻ Tài chính tự mâu thuẫn: "giảm giá X"
        // trong khi "Chưa có dịch vụ" (đã gặp ở ca DECLINED/CONSIDERING trước khi sửa).
        discountAmount: agreed ? caseServicesData.reduce((a, s) => a + s.discount, 0) : 0,
        paidAmount: paid,
        debtAmount: debt,
        createdById: consultantId,
        createdAt,
        updatedAt: createdAt,
        completedAt: status === "COMPLETED" ? createdAt : null,
        services: { create: agreed ? caseServicesData : [] },
      },
    });

    if (agreed) {
      if (paid > 0) {
        await prisma.payment.create({
          data: {
            caseId: caseRecord.id,
            amount: paid,
            method: pick(["CASH", "TRANSFER", "CARD"] as const),
            receivedById: users.letan,
            paidAt: createdAt,
          },
        });
      }
      // Vật tư
      const matN = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < matN; k++) {
        const m = pick(materials);
        await prisma.materialUsage.create({
          data: {
            caseId: caseRecord.id,
            materialId: m.id,
            name: m.name,
            unit: m.unit,
            quantity: 1 + Math.floor(Math.random() * 2),
            performedById: doctorId,
            performedAt: createdAt,
          },
        });
      }
      // Ảnh trước/sau
      await prisma.photo.create({
        data: { customerId: customer.id, caseId: caseRecord.id, type: "BEFORE", url: "/img/before.svg", uploadedById: doctorId, takenAt: createdAt },
      });
      await prisma.photo.create({
        data: { customerId: customer.id, caseId: caseRecord.id, type: "AFTER", url: "/img/after.svg", uploadedById: doctorId, takenAt: createdAt },
      });
      // Tái khám
      if (Math.random() > 0.5) {
        await prisma.followUp.create({
          data: {
            caseId: caseRecord.id,
            customerId: customer.id,
            scheduledAt: at(7 + Math.floor(Math.random() * 14), 10),
            note: "Tái khám kiểm tra kết quả",
            createdById: doctorId,
          },
        });
      }
      // Tin nhắn CSKH (yêu cầu số 5)
      await prisma.careMessage.create({
        data: {
          customerId: customer.id,
          caseId: caseRecord.id,
          channel: pick(["ZALO", "SMS", "CALL"] as const),
          direction: "OUT",
          content: pick([
            "Cảm ơn chị đã tin tưởng sử dụng dịch vụ. Chị nhớ kiêng cữ theo dặn dò của bác sĩ nhé!",
            "Bên em nhắc lịch tái khám cho chị ạ. Chị sắp xếp thời gian qua trung tâm giúp em nhé.",
            "Chúc mừng sinh nhật chị! Trung tâm gửi tặng chị voucher ưu đãi 15% ạ.",
          ]),
          createdById: users.cskh,
          createdAt,
        },
      });
    }

    caseCount++;
  }

  // Tháng này: nhiều hồ sơ
  for (let i = 0; i < 18; i++) await makeCase(daysAgo(Math.floor(Math.random() * 28)));
  // Tháng trước: ít hơn (để thể hiện tăng trưởng)
  for (let i = 0; i < 12; i++) await makeCase(daysAgo(30 + Math.floor(Math.random() * 28)));
  console.log(`  ✓ ${caseCount} hồ sơ điều trị (kèm thanh toán, vật tư, ảnh, CSKH)`);

  // ---- LỊCH LÀM VIỆC tuần này ----
  let shiftCount = 0;
  for (const uname of ["letan", "tuvan1", "tuvan2", "bacsi1", "bacsi2", "cskh"]) {
    for (let d = 0; d < 6; d++) {
      const morning = Math.random() > 0.5;
      await prisma.shift.create({
        data: {
          userId: users[uname],
          date: at(d, 0),
          startTime: morning ? "08:00" : "13:00",
          endTime: morning ? "12:00" : "20:00",
        },
      });
      shiftCount++;
    }
  }
  console.log(`  ✓ ${shiftCount} ca làm việc`);

  console.log("\n✅ Hoàn tất dữ liệu QA. Tài khoản demo phải đổi mật khẩu ngay khi đăng nhập:");
  for (const u of usersData) console.log(`   • ${u.username.padEnd(10)} — ${u.fullName} (${u.role})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Lỗi seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
