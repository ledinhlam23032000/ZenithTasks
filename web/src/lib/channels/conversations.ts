import { prisma } from "@/lib/db";
import type { ChannelAccount, ChannelKind, Conversation, Prisma } from "@/generated/prisma/client";

// ============================================================================
// LOGIC DÙNG CHUNG cho hộp thư hợp nhất (Zalo OA + Facebook Messenger) — dùng ở
// CẢ webhook (tin đến) LẪN server actions (tin đi, xem `cham-soc/hop-thu/actions.ts`).
// ============================================================================

/** Khung giờ nền tảng cho phép chủ động trả lời khách (best-effort — nền tảng luôn
 * là nguồn đúng cuối cùng, đây chỉ để CẢNH BÁO trước cho nhân viên trên giao diện). */
export const RESPONSE_WINDOW_HOURS: Record<ChannelKind, number> = {
  ZALO_OA: 48,
  FACEBOOK: 24,
};

/** Còn trong khung giờ phản hồi tự do không? Hàm THUẦN — dễ test. */
export function withinResponseWindow(kind: ChannelKind, lastInboundAt: Date | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  const hours = RESPONSE_WINDOW_HOURS[kind];
  return now.getTime() - lastInboundAt.getTime() <= hours * 3_600_000;
}

export async function findActiveChannelAccount(kind: ChannelKind, externalId: string): Promise<ChannelAccount | null> {
  return prisma.channelAccount.findFirst({ where: { kind, externalId, active: true } });
}

/**
 * Ghi nhận 1 tin nhắn ĐẾN từ khách + tạo/cập nhật hội thoại tương ứng. Chống ghi
 * trùng qua `externalMessageId` (Zalo/Facebook có thể gửi lại cùng 1 sự kiện webhook).
 * Trả `null` nếu tin đã ghi nhận trước đó (bỏ qua, không phải lỗi).
 */
export async function recordInboundMessage(opts: {
  channelAccount: ChannelAccount;
  externalUserId: string;
  profile?: { name?: string; avatarUrl?: string };
  text?: string;
  attachments?: Prisma.InputJsonValue;
  externalMessageId?: string;
  occurredAt?: Date;
}): Promise<Conversation | null> {
  const { channelAccount, externalUserId } = opts;

  if (opts.externalMessageId) {
    const existing = await prisma.message.findFirst({ where: { externalId: opts.externalMessageId }, select: { id: true } });
    if (existing) return null;
  }

  const occurredAt = opts.occurredAt ?? new Date();
  const preview = (opts.text?.trim() || (opts.attachments ? "[Tệp đính kèm]" : "")).slice(0, 200) || null;

  const conversation = await prisma.conversation.upsert({
    where: { channelAccountId_externalUserId: { channelAccountId: channelAccount.id, externalUserId } },
    create: {
      channelAccountId: channelAccount.id,
      kind: channelAccount.kind,
      externalUserId,
      displayName: opts.profile?.name,
      avatarUrl: opts.profile?.avatarUrl,
      lastMessageAt: occurredAt,
      lastMessagePreview: preview,
      lastDirection: "IN",
      unreadCount: 1,
    },
    update: {
      ...(opts.profile?.name ? { displayName: opts.profile.name } : {}),
      ...(opts.profile?.avatarUrl ? { avatarUrl: opts.profile.avatarUrl } : {}),
      lastMessageAt: occurredAt,
      lastMessagePreview: preview,
      lastDirection: "IN",
      unreadCount: { increment: 1 },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "IN",
      status: "RECEIVED",
      text: opts.text,
      attachments: opts.attachments,
      externalId: opts.externalMessageId,
      createdAt: occurredAt,
    },
  });

  return conversation;
}

/** Ghi nhận 1 tin nhắn ĐI (nhân viên/AI soạn rồi bấm gửi) — luôn gọi SAU khi đã gọi API gửi thật. */
export async function recordOutboundMessage(opts: {
  conversationId: string;
  text: string;
  sentById: string;
  result: { ok: true; externalId?: string } | { ok: false; error: string };
}): Promise<void> {
  const { conversationId, text, sentById, result } = opts;
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        direction: "OUT",
        status: result.ok ? "SENT" : "FAILED",
        text,
        sentById,
        externalId: result.ok ? result.externalId : undefined,
        errorMessage: result.ok ? undefined : result.error,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: text.slice(0, 200),
        lastDirection: "OUT",
      },
    }),
  ]);
}
