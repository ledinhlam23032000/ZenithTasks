import { prisma } from "@/lib/db";
import { userCan } from "@/lib/permissions";
import type { SafeUser } from "@/lib/auth";
import type { ChannelProvider, ConversationStatus, Prisma } from "@/generated/prisma/client";

export type InboxListItem = {
  id: string;
  status: ConversationStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  contactName: string;
  provider: ChannelProvider;
  preview: string;
  lastMessageAt: Date | null;
  unreadCount: number;
  responseTargetMinutes: number | null;
  openedAt: Date;
};

export async function listInbox(input: {
  queue: "unassigned" | "mine" | "all";
  provider?: ChannelProvider;
  status?: ConversationStatus;
  q?: string;
  user: SafeUser;
}): Promise<InboxListItem[]> {
  const canViewAll = userCan(input.user, "inbox.viewAll");
  const where: Prisma.ConversationWhereInput = {
    ...(input.status ? { status: input.status } : { status: { not: "CLOSED" } }),
    ...(input.queue === "unassigned"
      ? { assigneeId: null }
      : input.queue === "mine"
        ? { assigneeId: input.user.id }
        : canViewAll ? {} : { OR: [{ assigneeId: null }, { assigneeId: input.user.id }] }),
    thread: {
      ...(input.provider ? { channelAccount: { provider: input.provider } } : {}),
      ...(input.q?.trim() ? { channelContact: { displayName: { contains: input.q.trim(), mode: "insensitive" } } } : {}),
    },
  };
  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ thread: { lastMessageAt: "desc" } }, { openedAt: "desc" }],
    take: 100,
    include: {
      assignee: { select: { fullName: true } },
      thread: { include: { channelContact: { select: { displayName: true } }, channelAccount: { select: { provider: true, responseTargetMinutes: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    assigneeId: row.assigneeId,
    assigneeName: row.assignee?.fullName ?? null,
    contactName: row.thread.channelContact.displayName ?? "Khách chưa xác định",
    provider: row.thread.channelAccount.provider,
    preview: row.thread.lastMessagePreview ?? "Chưa có nội dung",
    lastMessageAt: row.thread.lastMessageAt,
    unreadCount: row.thread.unreadCount,
    responseTargetMinutes: row.thread.channelAccount.responseTargetMinutes,
    openedAt: row.openedAt,
  }));
}

export async function getInboxConversation(conversationId: string, user: SafeUser) {
  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      assignee: { select: { id: true, fullName: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: true, sentBy: { select: { fullName: true } } } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { fullName: true } } } },
      presence: { where: { heartbeatAt: { gt: new Date(Date.now() - 15_000) } }, include: { user: { select: { fullName: true, avatarUrl: true } } } },
      thread: { include: { channelAccount: { select: { id: true, provider: true, displayName: true, responseTargetMinutes: true } }, channelContact: { include: { customer: { select: { id: true, code: true, fullName: true, phoneLast5: true } } } } } },
    },
  });
  if (!row) return null;
  if (!userCan(user, "inbox.viewAll") && row.assigneeId && row.assigneeId !== user.id) return null;
  return row;
}

export async function getCustomerCareTimeline(customerId: string) {
  const [manual, inbox] = await Promise.all([
    prisma.careMessage.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.inboxMessage.findMany({ where: { conversation: { thread: { channelContact: { customerId } } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return [
    ...manual.map((item) => ({ id: item.id, source: "MANUAL" as const, at: item.createdAt, content: item.content, direction: item.direction })),
    ...inbox.map((item) => ({ id: item.id, source: "INBOX" as const, at: item.createdAt, content: item.content ?? `[${item.type}]`, direction: item.direction })),
  ].sort((left, right) => right.at.getTime() - left.at.getTime());
}
