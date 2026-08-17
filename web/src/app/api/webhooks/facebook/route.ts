import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyFacebookChallenge, verifyFacebookSignature, getFacebookUserProfile } from "@/lib/channels/facebook";
import { findActiveChannelAccount, recordInboundMessage } from "@/lib/channels/conversations";
import { decryptSecret } from "@/lib/secret-crypto";
import { sendCarePush } from "@/lib/push";
import type { Prisma } from "@/generated/prisma/client";

// Webhook Facebook Messenger (Fanpage) — CÔNG KHAI theo thiết kế (Meta gọi vào).
// KHÔNG nằm trong (app) nên proxy.ts không chặn (matcher loại trừ "api"). Bảo mật:
// (1) GET xác nhận qua hub.verify_token lúc đăng ký webhook trên Meta, (2) MỌI POST
// đều kiểm chữ ký X-Hub-Signature-256 bằng App Secret — xem lib/channels/facebook.ts.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (challenge && verifyFacebookChallenge(mode, token)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type FbAttachment = { type?: string; payload?: { url?: string } };
type FbMessagingEvent = {
  sender?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: FbAttachment[] };
};
type FbEntry = { id?: string; messaging?: FbMessagingEvent[] };
type FbWebhookPayload = { object?: string; entry?: FbEntry[] };

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const appSecret = (process.env.FB_APP_SECRET ?? "").trim();
    const sig = req.headers.get("x-hub-signature-256");
    if (!appSecret || !verifyFacebookSignature(rawBody, sig, appSecret)) {
      console.warn("[webhook/facebook] Bỏ qua sự kiện: chữ ký không hợp lệ hoặc thiếu FB_APP_SECRET.");
      return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 200 });
    }

    let payload: FbWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as FbWebhookPayload;
    } catch {
      return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
    }
    if (payload.object !== "page") return NextResponse.json({ ok: true });

    for (const entry of payload.entry ?? []) {
      const pageId = entry.id;
      if (!pageId) continue;
      const account = await findActiveChannelAccount("FACEBOOK", pageId);
      if (!account) continue;

      for (const evt of entry.messaging ?? []) {
        if (evt.message?.is_echo) continue; // tin do chính Page gửi vọng lại — không phải khách nhắn
        const psid = evt.sender?.id;
        if (!psid || !evt.message) continue;

        const attachments = (evt.message.attachments ?? [])
          .filter((a): a is FbAttachment & { payload: { url: string } } => Boolean(a.payload?.url))
          .map((a) => ({ type: a.type ?? "file", url: a.payload.url }));

        // Chỉ tra hồ sơ khi hội thoại CHƯA có tên hiển thị — tránh gọi Graph API cho mỗi tin.
        const existing = await prisma.conversation.findFirst({
          where: { channelAccountId: account.id, externalUserId: psid },
          select: { displayName: true },
        });
        const profile = existing?.displayName ? undefined : await getFacebookUserProfile(decryptSecret(account.accessTokenEnc), psid);

        const conversation = await recordInboundMessage({
          channelAccount: account,
          externalUserId: psid,
          profile,
          text: evt.message.text,
          attachments: attachments.length ? (attachments as Prisma.InputJsonValue) : undefined,
          externalMessageId: evt.message.mid,
          occurredAt: evt.timestamp ? new Date(evt.timestamp) : undefined,
        });

        if (conversation) {
          void sendCarePush({
            title: `[${account.externalName ?? account.label}] ${profile?.name ?? "Khách Facebook"}`,
            body: evt.message.text?.trim() || (attachments.length ? "Đã gửi tệp đính kèm." : "Có tin nhắn mới."),
            url: `/cham-soc/hop-thu/${conversation.id}`,
            tag: `inbox-${conversation.id}`,
          }).catch((error) => console.warn("[webhook/facebook] Push notification lỗi:", error));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/facebook] Lỗi xử lý:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
