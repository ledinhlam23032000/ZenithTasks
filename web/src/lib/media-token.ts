import crypto from "node:crypto";

// ============================================================================
// XÁC THỰC ẢNH (route /media/[file]) — bảo vệ ảnh y khoa (trước/sau, cận lâm sàng).
//
// Ảnh KHÔNG còn phục vụ công khai cho bất kỳ ai có link. Có 2 cách được phép xem:
//   1) Nhân viên đã ĐĂNG NHẬP (route tự kiểm tra cookie phiên `zsession`).
//   2) Khách qua CỔNG KHÁCH (link không cần đăng nhập): trang cổng khách ký sẵn
//      một "vé" ngắn hạn cho từng ảnh (?t=...). Route kiểm tra chữ ký + hạn dùng.
//
// Vé = HMAC-SHA256(tên_tệp + "." + hạn) ký bằng AUTH_SECRET. Không có vé hợp lệ và
// không đăng nhập → 401. Vé chỉ mở đúng 1 tệp và tự hết hạn (mặc định 24 giờ).
// ============================================================================

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

function key(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Thiếu biến môi trường AUTH_SECRET. Xem web/.env.example");
  return s;
}

/** Chuẩn hoá URL ảnh (/uploads/<f> hoặc /media/<f> hoặc <f>) → tên tệp đơn. */
function fileNameOf(url: string): string {
  let f = url;
  if (f.startsWith("/uploads/")) f = f.slice("/uploads/".length);
  else if (f.startsWith("/media/")) f = f.slice("/media/".length);
  return f.split("?")[0];
}

/** Ký một vé ngắn hạn cho 1 tệp ảnh. */
export function signMediaToken(file: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const sig = crypto.createHmac("sha256", key()).update(`${file}.${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

/** Kiểm tra vé cho 1 tệp: đúng chữ ký và chưa hết hạn. */
export function verifyMediaToken(file: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto.createHmac("sha256", key()).update(`${file}.${exp}`).digest("base64url");
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Trả về URL /media/<tệp>?t=<vé> để nhúng vào trang KHÔNG đăng nhập (cổng khách).
 * URL ngoài (http...) giữ nguyên. Dùng ở Server Component (cần AUTH_SECRET).
 */
export function withMediaToken(url: string | null | undefined, ttlMs: number = DEFAULT_TTL_MS): string {
  if (!url) return "";
  if (!url.startsWith("/uploads/") && !url.startsWith("/media/")) return url; // URL ngoài
  const file = fileNameOf(url);
  return `/media/${file}?t=${signMediaToken(file, ttlMs)}`;
}
