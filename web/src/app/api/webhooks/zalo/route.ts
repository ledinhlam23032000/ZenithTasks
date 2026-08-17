import { NextResponse } from "next/server";
import { verifyZaloWebhookMac, parseZaloTimestamp } from "@/lib/channels/zalo";
import { findActiveChannelAccount, recordInboundMessage } from "@/lib/channels/conversations";
import type { Prisma } from "@/generated/prisma/client";

// Webhook Zalo OA — CÔNG KHAI theo thiết kế (Zalo gọi vào, không có phiên đăng nhập).
// KHÔNG nằm trong (app) nên proxy.ts không chặn (matcher loại trừ "api"). Bảo mật dựa
// vào việc URL không công bố + kiểm chữ ký `mac` mỗi request — xem lib/channels/zalo.ts.
export const dynamic = "force-dynamic";

// Zalo không yêu cầu xác nhận URL qua GET, nhưng trả 200 để admin/dev tự kiểm tra
// URL đã trỏ đúng vào máy chủ (mở thẳng URL webhook trên trình duyệt).
export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

type ZaloWebhookPayload = {
  app_id?: string;
  event_name?: string;
  timestamp?: string | number;
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: {
    msg_id?: string;
    text?: string;
    attachments?: Array<{ payload?: { url?: string; thumbnail?: string } }>;
  };
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: ZaloWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as ZaloWebhookPayload;
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
    }

    const secretKey = (process.env.ZALO_OA_SECRET_KEY ?? "").trim();
    const macHeader = req.headers.get("x-zevent-signature") ?? "";
    const ok = verifyZaloWebhookMac({
      appId: String(payload.app_id ?? ""),
      rawBody,
      timestamp: String(payload.timestamp ?? ""),
      mac: macHeader,
      secretKey,
    });
    if (!ok) {
      console.warn("[webhook/zalo] Bỏ qua sự kiện: chữ ký không hợp lệ hoặc thiếu ZALO_OA_SECRET_KEY.");
      return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 200 });
    }

    const oaId = String(payload.recipient?.id ?? "");
    const senderId = String(payload.sender?.id ?? "");
    if (!oaId || !senderId) return NextResponse.json({ ok: true });

    const account = await findActiveChannelAccount("ZALO_OA", oaId);
    if (!account) return NextResponse.json({ ok: true, reason: "oa_not_connected" });

    const eventName = payload.event_name ?? "";
    const occurredAt = parseZaloTimestamp(payload.timestamp);
    const msgId = payload.message?.msg_id;

    if (eventName === "user_send_text") {
      await recordInboundMessage({
        channelAccount: account,
        externalUserId: senderId,
        text: payload.message?.text,
        externalMessageId: msgId,
        occurredAt,
      });
    } else if (eventName === "user_send_image" || eventName === "user_send_file" || eventName === "user_send_sticker") {
      const att = payload.message?.attachments?.[0]?.payload;
      const url = att?.url ?? att?.thumbnail;
      const attachments: Prisma.InputJsonValue | undefined = url ? [{ type: "image", url }] : undefined;
      await recordInboundMessage({
        channelAccount: account,
        externalUserId: senderId,
        attachments,
        externalMessageId: msgId,
        occurredAt,
      });
    }
    // Các sự kiện khác (user_follow, user_unfollow, oa_send_text…) bỏ qua có chủ đích.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/zalo] Lỗi xử lý:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
