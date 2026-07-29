import crypto from "node:crypto";

// ============================================================================
// MÃ HOÁ BÍ MẬT DÙNG CHUNG (access/refresh token của kênh Zalo OA/Facebook…).
// Cùng thuật toán AES-256-GCM + cùng khoá với `lib/phone.ts` (PHONE_ENC_KEY —
// đây là khoá mã hoá dữ liệu nhạy cảm chung của toàn hệ thống), nhưng KHÔNG
// chuẩn hoá theo số điện thoại — dùng cho chuỗi bí mật bất kỳ.
// ============================================================================

function getKey(): Buffer {
  const b64 = process.env.PHONE_ENC_KEY;
  if (!b64) {
    throw new Error("Thiếu biến môi trường PHONE_ENC_KEY. Xem web/.env.example");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("PHONE_ENC_KEY phải là khoá 32 byte mã hoá base64.");
  }
  return key;
}

/** Mã hoá AES-256-GCM, trả về chuỗi "iv:tag:ciphertext" (base64). */
export function encryptSecret(raw: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Giải mã — CHỈ dùng phía máy chủ để gọi API kênh, không trả ra giao diện. */
export function decryptSecret(stored: string): string {
  const [ivB, tagB, dataB] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}
