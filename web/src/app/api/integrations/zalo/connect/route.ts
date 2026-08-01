import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireCap } from "@/lib/auth";
import { zaloConfigured, zaloOAuthUrl } from "@/lib/channels/zalo";
import { ZALO_STATE_COOKIE, ZALO_SETTINGS_PATH } from "@/lib/channels/zalo-oauth-constants";
import { originFromRequest } from "@/lib/request-origin";

// Bấm nút "Kết nối Zalo OA" ở /cham-soc/ket-noi đưa tới đây → chuyển sang trang
// Zalo xin quyền OA → Zalo gọi lại /api/integrations/zalo/callback.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Nằm dưới /api nên KHÔNG được proxy.ts bảo vệ — tự kiểm quyền ở đây.
  await requireCap("mod:ket-noi-kenh");

  if (!zaloConfigured()) {
    const msg = encodeURIComponent("Chưa cấu hình ZALO_APP_ID/ZALO_APP_SECRET trên máy chủ — liên hệ kỹ thuật.");
    return NextResponse.redirect(new URL(`${ZALO_SETTINGS_PATH}?zalo_error=${msg}`, req.url));
  }

  const redirectUri = `${originFromRequest(req)}/api/integrations/zalo/callback`;
  const state = crypto.randomBytes(24).toString("hex");

  const store = await cookies();
  store.set(ZALO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 phút — đủ để chủ tài khoản duyệt xong trên Zalo
  });

  return NextResponse.redirect(zaloOAuthUrl(redirectUri, state));
}
