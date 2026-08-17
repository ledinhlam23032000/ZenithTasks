import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";
import type { ChannelAccount } from "@/generated/prisma/client";
import type { SendResult } from "./types";

// ============================================================================
// ZALO OFFICIAL ACCOUNT (OA) API — tích hợp kênh giao tiếp.
//
// Zalo OA KHÁC Zalo cá nhân: Zalo cá nhân KHÔNG có API chính thức (mọi thư viện
// tự động hoá tài khoản cá nhân trên GitHub đều là reverse-engineer, vi phạm điều
// khoản Zalo và dễ bị khoá tài khoản — KHÔNG dùng). Muốn nhắn/nhận tin tự động
// BẮT BUỘC phải có Official Account (đăng ký tại oa.zalo.me) + ứng dụng tại
// developers.zalo.me lấy App ID + Secret Key.
//
// Cấu hình qua biến môi trường:
//   ZALO_APP_ID          — App ID (developers.zalo.me)
//   ZALO_APP_SECRET       — Secret Key của app (dùng để đổi/làm mới access token)
//   ZALO_OA_SECRET_KEY    — Secret Key riêng của OA để KÝ/KIỂM webhook (mục Webhook
//                            trong trang quản trị OA — có thể trùng ZALO_APP_SECRET
//                            tuỳ cấu hình của Zalo, nhưng để riêng biến cho chắc).
//
// ⚠️ Tài liệu chính thức developers.zalo.me chặn truy cập tự động (403) nên công
// thức xác thực webhook dưới đây được tổng hợp từ nhiều nguồn cộng đồng khớp nhau
// (không lấy được bản gốc để trích dẫn 1:1) — NÊN kiểm lại khi có OA thật kết nối
// (xem log lỗi ký nếu webhook báo "chữ ký không hợp lệ" hàng loạt).
// ============================================================================

const OAUTH_TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const OAUTH_PERMISSION_URL = "https://oauth.zaloapp.com/v4/oa/permission";
const API_BASE = "https://openapi.zalo.me";
const REFRESH_MARGIN_MS = 5 * 60_000; // làm mới sớm 5' trước khi hết hạn

export function zaloConfigured(): boolean {
  return Boolean((process.env.ZALO_APP_ID ?? "").trim() && (process.env.ZALO_APP_SECRET ?? "").trim());
}

function appId(): string {
  const id = (process.env.ZALO_APP_ID ?? "").trim();
  if (!id) throw new Error("Thiếu biến môi trường ZALO_APP_ID.");
  return id;
}

function appSecret(): string {
  const s = (process.env.ZALO_APP_SECRET ?? "").trim();
  if (!s) throw new Error("Thiếu biến môi trường ZALO_APP_SECRET.");
  return s;
}

/** URL cho ADMIN bấm "Kết nối Zalo OA" — chuyển sang trang Zalo xin quyền. */
export function zaloOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({ app_id: appId(), redirect_uri: redirectUri, state });
  return `${OAUTH_PERMISSION_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  error?: number | string;
  error_name?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      secret_key: appSecret(),
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || `Zalo từ chối yêu cầu lấy token (HTTP ${res.status}).`);
  }
  return data;
}

/** Đổi authorization code (từ callback OAuth) lấy access_token + refresh_token. */
export async function exchangeZaloCode(code: string): Promise<TokenResponse> {
  return tokenRequest({ code, app_id: appId(), grant_type: "authorization_code" });
}

async function refreshZaloToken(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({ refresh_token: refreshToken, app_id: appId(), grant_type: "refresh_token" });
}

// Khoá TRONG TIẾN TRÌNH theo channelAccountId: nếu 2 lượt gửi tin gần như đồng thời
// đúng lúc access_token sắp hết hạn, cả 2 đều thấy needsRefresh=true — không khoá lại
// thì cả 2 CÙNG gọi refreshZaloToken() bằng CÙNG 1 refresh_token cũ; Zalo xoay refresh
// token mỗi lần dùng nên request tới sau chắc chắn bị từ chối (token đã bị "đốt" bởi
// request tới trước), khiến tin nhắn của người gửi thứ 2 lỗi dù không đáng phải lỗi.
// Gộp lại: request tới sau chờ dùng chung kết quả của lượt refresh đang chạy.
const refreshInFlight = new Map<string, Promise<string>>();

/**
 * Đảm bảo có access_token còn hiệu lực cho 1 ChannelAccount Zalo — tự làm mới +
 * LƯU LẠI (cả refresh_token mới, vì Zalo xoay refresh_token mỗi lần dùng) nếu
 * sắp hết hạn. Gọi hàm này trước MỌI lần gửi tin.
 */
export async function ensureZaloAccessToken(account: ChannelAccount): Promise<string> {
  const expMs = account.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expMs - REFRESH_MARGIN_MS < Date.now();
  if (!needsRefresh) return decryptSecret(account.accessTokenEnc);
  const refreshTokenEnc = account.refreshTokenEnc;
  if (!refreshTokenEnc) return decryptSecret(account.accessTokenEnc);

  const pending = refreshInFlight.get(account.id);
  if (pending) return pending;

  const task = (async () => {
    const data = await refreshZaloToken(decryptSecret(refreshTokenEnc));
    const accessToken = data.access_token!;
    const refreshToken = data.refresh_token ?? decryptSecret(refreshTokenEnc);
    const expiresInSec = Number(data.expires_in ?? 3600) || 3600;

    await prisma.channelAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEnc: encryptSecret(accessToken),
        refreshTokenEnc: encryptSecret(refreshToken),
        tokenExpiresAt: new Date(Date.now() + expiresInSec * 1000),
      },
    });
    return accessToken;
  })();

  refreshInFlight.set(account.id, task);
  try {
    return await task;
  } finally {
    refreshInFlight.delete(account.id);
  }
}

type ZaloEnvelope<T> = { error?: number; message?: string; data?: T };

/** Gửi tin nhắn văn bản trả lời khách (trong khung thời gian hỗ trợ — Zalo giới hạn theo chính sách của OA). */
export async function sendZaloTextMessage(accessToken: string, userId: string, text: string): Promise<SendResult> {
  try {
    const res = await fetch(`${API_BASE}/v3.0/oa/message/cs`, {
      method: "POST",
      headers: { "content-type": "application/json", access_token: accessToken },
      body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
    });
    const data = (await res.json().catch(() => ({}))) as ZaloEnvelope<{ message_id?: string }>;
    if (!res.ok || (data.error && data.error !== 0)) {
      return { ok: false, error: data.message || `Zalo từ chối gửi tin (HTTP ${res.status}).` };
    }
    return { ok: true, externalId: data.data?.message_id };
  } catch {
    return { ok: false, error: "Không kết nối được tới Zalo (kiểm tra mạng máy chủ)." };
  }
}

/** Lấy thông tin OA (tên/avatar) — dùng để hiển thị + kiểm tra kết nối còn sống. */
export async function getOaInfo(
  accessToken: string,
): Promise<{ ok: true; oaId: string; name: string; avatar?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/v2.0/oa/getoa`, { headers: { access_token: accessToken } });
    const data = (await res.json().catch(() => ({}))) as ZaloEnvelope<{ oa_id?: string; name?: string; avatar?: string }>;
    if (!res.ok || (data.error && data.error !== 0) || !data.data) {
      return { ok: false, error: data.message || `Không lấy được thông tin OA (HTTP ${res.status}).` };
    }
    return { ok: true, oaId: data.data.oa_id ?? "", name: data.data.name ?? "Zalo OA", avatar: data.data.avatar };
  } catch {
    return { ok: false, error: "Không kết nối được tới Zalo." };
  }
}

/** Zalo gửi `timestamp` dạng mili-giây; phòng trường hợp gửi giây (10 chữ số). */
export function parseZaloTimestamp(raw: unknown): Date {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return new Date();
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms);
}

/**
 * Kiểm tra chữ ký webhook Zalo (`X-ZEvent-Signature: mac=<hex>` hoặc giá trị hex
 * trần) — công thức cộng đồng: sha256(app_id + rawBody + timestamp + oaSecretKey).
 * `rawBody` PHẢI là chuỗi thô đúng byte Zalo gửi (đọc trước khi JSON.parse).
 */
export function verifyZaloWebhookMac(opts: { appId: string; rawBody: string; timestamp: string; mac: string; secretKey: string }): boolean {
  const { appId: aid, rawBody, timestamp, secretKey } = opts;
  const mac = opts.mac.replace(/^mac=/, "").trim();
  if (!mac || !timestamp || !secretKey) return false;
  const expected = crypto.createHash("sha256").update(aid + rawBody + timestamp + secretKey).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(mac, "hex"));
  } catch {
    return false;
  }
}
