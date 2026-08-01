import { userCan } from "@/lib/permissions";
import type { ChannelProvider, ConversationStatus, InboxDirection, InboxMessageStatus, InboxMessageType, Role } from "@/generated/prisma/client";

type ViewerUser = { id: string; role: Role; permissions?: unknown };

export type InboxViewModelInput = {
  enabled: boolean;
  now: Date;
  user: ViewerUser;
  conversations: Array<{
    id: string;
    status: ConversationStatus;
    assigneeId: string | null;
    assigneeName: string | null;
    contactName: string;
    customerId: string | null;
    provider: ChannelProvider;
    preview: string;
    lastMessageAt: Date | null;
    unreadCount: number;
    responseTargetMinutes: number | null;
    openedAt: Date;
    firstResponseAt: Date | null;
  }>;
  selected: null | {
    id: string;
    customerId: string | null;
    provider: ChannelProvider;
    messages: Array<{
      id: string;
      direction: InboxDirection;
      type: InboxMessageType;
      content: string | null;
      status: InboxMessageStatus;
      providerErrorMessage?: string | null;
      createdAt: Date;
      attachmentIds: string[];
    }>;
    presence: Array<{ userId: string; fullName: string; isTyping: boolean }>;
  };
};

const providerLabel = (provider: ChannelProvider) => provider === "ZALO_OA" ? "Zalo OA" : "Facebook";

const statusLabel = (status: InboxMessageStatus) => ({
  PENDING: "Đang gửi",
  SENT: "Đã gửi",
  RECEIVED: "Đã nhận",
  DELIVERED: "Đã giao",
  READ: "Đã đọc",
  FAILED: "Gửi thất bại",
}[status]);

export function buildInboxViewModel(input: InboxViewModelInput) {
  const canUseInbox = input.enabled && userCan(input.user, "inbox.view");
  if (!canUseInbox) return { canUseInbox, showManualTab: true, conversations: [], selected: null };

  const conversations = input.conversations.map((item) => ({
    id: item.id,
    status: item.status,
    assigneeId: item.assigneeId,
    assigneeName: item.assigneeName,
    contactName: item.contactName,
    customerId: item.customerId,
    customerLabel: item.customerId ? "Đã liên kết hồ sơ" : "Chưa liên kết hồ sơ",
    provider: item.provider,
    providerLabel: providerLabel(item.provider),
    preview: item.preview,
    lastMessageAt: item.lastMessageAt?.toISOString() ?? null,
    unreadCount: Math.max(0, item.unreadCount),
    overdue: item.responseTargetMinutes !== null
      && item.firstResponseAt === null
      && input.now.getTime() - item.openedAt.getTime() > item.responseTargetMinutes * 60_000,
  }));

  const typing = input.selected?.presence.find((item) => item.isTyping);
  const viewing = input.selected?.presence[0];
  const selected = input.selected ? {
    id: input.selected.id,
    customerId: input.selected.customerId,
    provider: input.selected.provider,
    providerLabel: providerLabel(input.selected.provider),
    presenceLabel: typing ? `${typing.fullName} đang soạn tin` : viewing ? `${viewing.fullName} đang xem` : null,
    messages: input.selected.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      type: message.type,
      content: message.content,
      status: message.status,
      statusLabel: statusLabel(message.status),
      errorLabel: message.status === "FAILED" ? "Không gửi được. Hãy kiểm tra kết nối kênh rồi thử lại." : null,
      createdAt: message.createdAt.toISOString(),
      attachmentIds: message.attachmentIds,
    })),
  } : null;

  return { canUseInbox, showManualTab: true, conversations, selected };
}

export type InboxViewModel = ReturnType<typeof buildInboxViewModel>;
