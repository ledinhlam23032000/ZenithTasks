import crypto from "node:crypto";
import type { SendResult } from "./types";

// ============================================================================
// FACEBOOK MESSENGER PLATFORM (Fanpage) — tích hợp kênh giao tiếp.
//
// Cần 1 Facebook App (developers.facebook.com) gắn với Fanpage của phòng khám +
// quyền `pages_messaging`. Page Access Token nên lấy qua Meta Business Suite
// (System User) để KHÔNG hết hạn — token lấy nhanh qua Graph API Explorer chỉ
// sống ~1 giờ, không phù hợp chạy lâu dài (xem hướng dẫn ở trang Kết nối kênh).
//
// Cấu hình qua biến môi trường:
//   FB_APP_SECRET   — App Secret (Cài đặt > Cơ bản trên trang quản trị App) —
//                      dùng để KIỂM chữ ký webhook (X-Hub-Signature-256).
//   FB_VERIFY_TOKEN — chuỗi tự đặt, khai báo TRÙNG khi đăng ký webhook trên
//                      Meta (bước xác nhận URL — hub.verify_token).
//   FB_GRAPH_API_VERSION — tuỳ chọn, mặc định "v21.0".
// ============================================================================

function graphVersion(): string {
  return (process.env.FB_GRAPH_API_VERSION ?? "").trim() || "v21.0";
}

function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

export function facebookWebhookConfigured(): boolean {
  return Boolean((process.env.FB_APP_SECRET ?? "").trim() && (process.env.FB_VERIFY_TOKEN ?? "").trim());
}

/** Xác nhận handshake khi đăng ký webhook trên Meta (GET ?hub.mode=subscribe...). */
export function verifyFacebookChallenge(mode: string | null, token: string | null): boolean {
  const expected = (process.env.FB_VERIFY_TOKEN ?? "").trim();
  return Boolean(expected) && mode === "subscribe" && token === expected;
}

/**
 * Kiểm chữ ký `X-Hub-Signature-256: sha256=<hex>` — HMAC-SHA256 của RAW body
 * (đọc trước khi JSON.parse) bằng App Secret. Chuẩn Messenger Platform ổn định
 * nhiều năm nay, không đổi.
 */
export function verifyFacebookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  const [scheme, hex] = signatureHeader.split("=");
  if (scheme !== "sha256" || !hex) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hex, "hex"));
  } catch {
    return false;
  }
}

type GraphError = { error?: { message?: string; type?: string; code?: number } };

/** Gửi tin nhắn văn bản trả lời khách qua Page (trong khung 24h hoặc theo Message Tag). */
export async function sendFacebookTextMessage(pageAccessToken: string, psid: string, text: string): Promise<SendResult> {
  try {
    const res = await fetch(`${graphBase()}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: psid },
        message: { text },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as GraphError & { message_id?: string };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message || `Facebook từ chối gửi tin (HTTP ${res.status}).` };
    }
    return { ok: true, externalId: data.message_id };
  } catch {
    return { ok: false, error: "Không kết nối được tới Facebook (kiểm tra mạng máy chủ)." };
  }
}

/** Kiểm tra Page Access Token còn dùng được + lấy tên Page hiển thị. */
export async function getPageInfo(
  pageAccessToken: string,
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${graphBase()}/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`);
    const data = (await res.json().catch(() => ({}))) as GraphError & { id?: string; name?: string };
    if (!res.ok || data.error || !data.id) {
      return { ok: false, error: data.error?.message || `Token không hợp lệ (HTTP ${res.status}).` };
    }
    return { ok: true, id: data.id, name: data.name ?? "Facebook Page" };
  } catch {
    return { ok: false, error: "Không kết nối được tới Facebook." };
  }
}

/** Lấy tên/avatar người gửi (best-effort — Facebook có thể chặn tuỳ quyền app). */
export async function getFacebookUserProfile(
  pageAccessToken: string,
  psid: string,
): Promise<{ name?: string; avatarUrl?: string }> {
  try {
    const res = await fetch(
      `${graphBase()}/${encodeURIComponent(psid)}?fields=name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`,
    );
    if (!res.ok) return {};
    const data = (await res.json().catch(() => ({}))) as { name?: string; profile_pic?: string };
    return { name: data.name, avatarUrl: data.profile_pic };
  } catch {
    return {};
  }
}

/** Đổi token ngắn hạn (Graph API Explorer, ~1h) sang token dài hạn (~60 ngày). */
export async function exchangeLongLivedToken(
  shortLivedToken: string,
): Promise<{ ok: true; accessToken: string; expiresInSec?: number } | { ok: false; error: string }> {
  const appId = (process.env.FB_APP_ID ?? "").trim();
  const appSecret = (process.env.FB_APP_SECRET ?? "").trim();
  if (!appId || !appSecret) {
    return { ok: false, error: "Thiếu FB_APP_ID/FB_APP_SECRET trên máy chủ — không tự gia hạn được, hãy dán token dài hạn thủ công." };
  }
  try {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });
    const res = await fetch(`${graphBase()}/oauth/access_token?${params.toString()}`);
    const data = (await res.json().catch(() => ({}))) as GraphError & { access_token?: string; expires_in?: number };
    if (!res.ok || data.error || !data.access_token) {
      return { ok: false, error: data.error?.message || `Gia hạn token thất bại (HTTP ${res.status}).` };
    }
    return { ok: true, accessToken: data.access_token, expiresInSec: data.expires_in };
  } catch {
    return { ok: false, error: "Không kết nối được tới Facebook." };
  }
}
