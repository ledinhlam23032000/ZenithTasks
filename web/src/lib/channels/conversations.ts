import { prisma } from "@/lib/db";
import { isUniqueViolation } from "@/lib/seq";
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
 * trùng qua `externalMessageId` (Zalo/Facebook có thể gửi lại cùng 1 sự kiện webhook):
 * `Message.externalId` có ràng buộc UNIQUE ở CSDL (migration message_external_id_unique)
 * + cả việc tạo hội thoại lẫn tin nhắn chạy trong 1 transaction, nên 2 webhook trùng
 * đến gần như đồng thời KHÔNG thể cùng lọt qua (trước đây kiểm tra rồi mới ghi, tách
 * rời 2 bước, 2 request có thể cùng vượt qua bước kiểm tra rồi cùng tạo trùng).
 * Trả `null` nếu tin đã ghi nhận trước đó (bỏ qua, không phải lỗi).
 */
async function pickInboundAssignee(tx: Prisma.TransactionClient): Promise<string | null> {
  const candidates = await tx.user.findMany({
    where: { active: true, role: "CARE" },
    select: { id: true },
    orderBy: { fullName: "asc" },
  });
  if (candidates.length === 0) return null;
  const counts = await tx.conversation.groupBy({
    by: ["assignedToId"],
    where: { assignedToId: { in: candidates.map((candidate) => candidate.id) }, status: { in: ["OPEN", "IN_PROGRESS"] } },
    _count: { _all: true },
  });
  const countById = new Map(counts.map((row) => [row.assignedToId, row._count._all]));
  return [...candidates].sort((a, b) => (countById.get(a.id) ?? 0) - (countById.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0]?.id ?? null;
}

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
  const occurredAt = opts.occurredAt ?? new Date();
  const preview = (opts.text?.trim() || (opts.attachments ? "[Tệp đính kèm]" : "")).slice(0, 200) || null;
  const slaDueAt = new Date(occurredAt.getTime() + RESPONSE_WINDOW_HOURS[channelAccount.kind] * 3_600_000);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({
        where: { channelAccountId_externalUserId: { channelAccountId: channelAccount.id, externalUserId } },
        select: { id: true, assignedToId: true },
      });
      const assignedToId = existing?.assignedToId ?? await pickInboundAssignee(tx);
      const conversation = await tx.conversation.upsert({
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
          status: "OPEN",
          assignedToId,
          lastInboundAt: occurredAt,
          slaDueAt,
        },
        update: {
          ...(opts.profile?.name ? { displayName: opts.profile.name } : {}),
          ...(opts.profile?.avatarUrl ? { avatarUrl: opts.profile.avatarUrl } : {}),
          lastMessageAt: occurredAt,
          lastMessagePreview: preview,
          lastDirection: "IN",
          unreadCount: { increment: 1 },
          status: "OPEN",
          assignedToId,
          lastInboundAt: occurredAt,
          slaDueAt,
        },
      });

      await tx.message.create({
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
    });
  } catch (e) {
    // externalId đã tồn tại (webhook gửi lại đúng sự kiện cũ) → bỏ qua toàn bộ giao dịch
    // (kể cả phần cập nhật hội thoại/SLA), không phải lỗi thật.
    if (isUniqueViolation(e)) return null;
    throw e;
  }
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
        status: "IN_PROGRESS",
        slaDueAt: null,
      },
    }),
  ]);
}
