import "dotenv/config";
import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
//  ĐỔI KHOÁ MÃ HOÁ SỐ ĐIỆN THOẠI (PHONE_ENC_KEY) — mã hoá lại toàn bộ SĐT.
//
//  Cách chạy (BÊN TRONG container app, nơi có DATABASE_URL):
//    docker compose exec \
//      -e OLD_PHONE_ENC_KEY="<khoá cũ>" -e NEW_PHONE_ENC_KEY="<khoá mới>" \
//      app npx tsx prisma/rotate-phone-key.ts
//
//  Sau khi chạy XONG: đặt PHONE_ENC_KEY = <khoá mới> (trong .env) rồi khởi động lại.
//  Tạo khoá mới: openssl rand -base64 32
// ============================================================================

function key(b64: string): Buffer {
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("Khoá phải là base64 của đúng 32 byte.");
  return k;
}
function decrypt(stored: string, k: Buffer): string {
  const [iv, tag, data] = stored.split(":");
  const d = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
function encrypt(raw: string, k: Buffer): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([c.update(raw, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}
function hmac(raw: string, k: Buffer): string {
  return crypto.createHmac("sha256", k).update(raw).digest("hex");
}

async function main() {
  const OLD = process.env.OLD_PHONE_ENC_KEY;
  const NEW = process.env.NEW_PHONE_ENC_KEY;
  if (!OLD || !NEW) throw new Error("Thiếu OLD_PHONE_ENC_KEY hoặc NEW_PHONE_ENC_KEY.");
  const oldK = key(OLD);
  const newK = key(NEW);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let ok = 0;
  let fail = 0;

  // 1) Khách hàng (Customer) — luôn có SĐT.
  const customers = await prisma.customer.findMany({ select: { id: true, phoneEnc: true } });
  console.log(`Bắt đầu mã hoá lại ${customers.length} số điện thoại khách hàng...`);
  for (const c of customers) {
    try {
      const phone = decrypt(c.phoneEnc, oldK); // chuỗi số đã chuẩn hoá lúc lưu
      await prisma.customer.update({
        where: { id: c.id },
        data: { phoneEnc: encrypt(phone, newK), phoneHash: hmac(phone, newK) },
      });
      ok++;
    } catch {
      fail++;
      console.error("  ✗ Không giải mã được khách:", c.id);
    }
  }

  // 2) Khách tham khảo (Lead) — SĐT là tuỳ chọn, chỉ xử lý bản ghi CÓ phoneEnc.
  const leads = await prisma.lead.findMany({ where: { phoneEnc: { not: null } }, select: { id: true, phoneEnc: true } });
  console.log(`Bắt đầu mã hoá lại ${leads.length} số điện thoại khách tham khảo...`);
  for (const l of leads) {
    try {
      const phone = decrypt(l.phoneEnc as string, oldK);
      await prisma.lead.update({
        where: { id: l.id },
        data: { phoneEnc: encrypt(phone, newK), phoneHash: hmac(phone, newK) },
      });
      ok++;
    } catch {
      fail++;
      console.error("  ✗ Không giải mã được khách tham khảo:", l.id);
    }
  }

  console.log(`Hoàn tất: ${ok} thành công, ${fail} lỗi.`);
  await prisma.$disconnect();
  if (fail > 0) {
    // Thoát mã lỗi để script tự động KHÔNG đổi PHONE_ENC_KEY khi còn bản ghi giải mã hỏng.
    console.error("→ CÓ LỖI: KHÔNG đổi PHONE_ENC_KEY. Giữ nguyên khoá cũ và kiểm tra lại.");
    process.exit(2);
  }
  console.log("→ Bây giờ đặt PHONE_ENC_KEY = NEW_PHONE_ENC_KEY trong .env rồi khởi động lại.");
}

main().catch((e) => {
  console.error("LỖI:", e);
  process.exit(1);
});
