/**
 * Giới hạn số lần đăng nhập sai để chống dò mật khẩu (brute-force).
 * Lưu trong bộ nhớ tiến trình — phù hợp khi chạy 1 container (mô hình của trung tâm).
 * Khoá tạm theo cặp IP + tên đăng nhập, và theo IP để chặn dò nhiều tài khoản.
 */

type Bucket = { count: number; firstAt: number; lockedUntil: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // cửa sổ đếm: 15 phút
const LOCK_MS = 15 * 60 * 1000; // thời gian khoá khi vượt ngưỡng: 15 phút

/** Kiểm tra một khoá có đang bị tạm khoá không. */
function isLocked(key: string, max: number): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) return { ok: true };
  if (b.lockedUntil > now) {
    return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  if (now - b.firstAt > WINDOW_MS) {
    buckets.delete(key);
    return { ok: true };
  }
  if (b.count >= max) {
    b.lockedUntil = now + LOCK_MS;
    return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: true };
}

/**
 * Kiểm tra trước khi xác thực. Trả về { ok:false, retryAfterSec } nếu đang bị khoá.
 * Ngưỡng: 6 lần sai cho 1 (IP + tài khoản); 30 lần sai cho mỗi IP.
 */
export function checkLoginAllowed(ip: string, username: string): { ok: boolean; retryAfterSec?: number } {
  const a = isLocked(`u:${ip}:${username}`, 6);
  if (!a.ok) return a;
  return isLocked(`ip:${ip}`, 30);
}

/** Ghi nhận một lần đăng nhập sai. */
export function registerLoginFailure(ip: string, username: string): void {
  for (const key of [`u:${ip}:${username}`, `ip:${ip}`]) {
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now - b.firstAt > WINDOW_MS) b = { count: 0, firstAt: now, lockedUntil: 0 };
    b.count += 1;
    buckets.set(key, b);
  }
  // Dọn rác nhẹ nhàng để Map không phình mãi.
  if (buckets.size > 5000) {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.lockedUntil < now && now - v.firstAt > WINDOW_MS) buckets.delete(k);
    }
  }
}

/** Xoá bộ đếm khi đăng nhập thành công. */
export function clearLoginFailures(ip: string, username: string): void {
  buckets.delete(`u:${ip}:${username}`);
  buckets.delete(`ip:${ip}`);
}

// ---- Bộ đếm chung (vd: chống spam đặt lịch online) ----
const hits = new Map<string, { n: number; first: number }>();

/** Tăng bộ đếm cho 1 khoá; trả về TRUE nếu đã VƯỢT giới hạn trong cửa sổ. */
export function bump(key: string, max: number, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  let b = hits.get(key);
  if (!b || now - b.first > windowMs) b = { n: 0, first: now };
  b.n += 1;
  hits.set(key, b);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.first > windowMs) hits.delete(k);
  }
  return b.n > max;
}
