import crypto from "node:crypto";

// ============================================================================
// BẢO MẬT SỐ ĐIỆN THOẠI (Yêu cầu số 7)
//
// • Số điện thoại đầy đủ được mã hoá AES-256-GCM, KHÔNG bao giờ hiển thị cho
//   nhân viên trên giao diện. Chỉ dùng cho hệ thống (ví dụ gửi SMS/Zalo về sau).
// • Chỉ lưu & hiển thị 5 số cuối để tra cứu.
// • Lưu thêm một mã băm (HMAC) của số đã chuẩn hoá để phát hiện trùng hồ sơ
//   mà không cần giải mã.
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

/** Chuẩn hoá: bỏ mọi ký tự không phải số; chuyển +84/84 thành 0. */
export function normalizePhone(raw: string): string {
  let p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("84") && p.length >= 11) {
    p = "0" + p.slice(2);
  }
  return p;
}

/** Lấy 5 số cuối — dùng để tra cứu và hiển thị. */
export function phoneLast5(raw: string): string {
  return normalizePhone(raw).slice(-5);
}

/** HMAC-SHA256 của số đã chuẩn hoá — dùng chống trùng hồ sơ. */
export function hashPhone(raw: string): string {
  return crypto.createHmac("sha256", getKey()).update(normalizePhone(raw)).digest("hex");
}

/** Mã hoá AES-256-GCM, trả về chuỗi "iv:tag:ciphertext" (base64). */
export function encryptPhone(raw: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(normalizePhone(raw), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Giải mã — CHỈ dùng phía máy chủ cho mục đích gửi tin, không trả ra giao diện. */
export function decryptPhone(stored: string): string {
  const [ivB, tagB, dataB] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

/** Chuỗi hiển thị che số: chỉ lộ 5 số cuối. */
export function maskPhone(last5: string | null | undefined): string {
  if (!last5) return "•••••";
  return `••• ${last5}`;
}

/** Kiểm tra một chuỗi tra cứu có phải đúng 5 chữ số không. */
export function isValidLast5(q: string): boolean {
  return /^\d{5}$/.test(q.trim());
}

/**
 * Redact phone-shaped digit sequences before accepting free text into a field
 * that may be visible in reports or appointment history. The real number is
 * stored only in the encrypted phone field.
 */
export function redactPhoneLikeText(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/(^|[^0-9])0[0-9](?:[ .-]?[0-9]){8,9}([^0-9]|$)/g, "$1[SĐT đã ẩn]$2")
    .replace(/(^|[^0-9])84(?:[ .-]?[0-9]){9,10}([^0-9]|$)/g, "$1[SĐT đã ẩn]$2");
}
