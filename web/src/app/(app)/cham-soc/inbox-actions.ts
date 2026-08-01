"use server";

import { revalidatePath } from "next/cache";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userCan } from "@/lib/permissions";
import { createMetaProvider } from "@/lib/channels/providers/meta";
import { createZaloProvider } from "@/lib/channels/providers/zalo";
import { withValidAccessToken } from "@/lib/channels/token-manager";
import type { ConversationStatus } from "@/generated/prisma/client";

export type InboxActionResult = { ok?: true; error?: string; nonce?: number };

const refreshInbox = () => revalidatePath("/cham-soc");
const formText = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

async function visibleConversation(id: string, user: Awaited<ReturnType<typeof requireCap>>) {
  const conversation = await prisma.conversation.findUnique({ where: { id }, include: { thread: { include: { channelAccount: true, channelContact: true } } } });
  if (!conversation) throw new Error("Không tìm thấy hội thoại.");
  if (!userCan(user, "inbox.viewAll") && conversation.assigneeId && conversation.assigneeId !== user.id) throw new Error("Hội thoại đang thuộc nhân viên khác.");
  return conversation;
}

export async function claimInboxConversation(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.assign");
  const id = formText(data, "conversationId");
  const conversation = await visibleConversation(id, user);
  if (conversation.assigneeId === user.id) return { ok: true };
  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.conversation.updateMany({ where: { id, assigneeId: null, version: conversation.version }, data: { assigneeId: user.id, assignedAt: new Date(), assignedById: user.id, version: { increment: 1 } } });
    if (result.count !== 1) return false;
    await tx.conversationEvent.create({ data: { conversationId: id, actorId: user.id, type: "ASSIGNED", data: { assigneeId: user.id } } });
    return true;
  });
  if (!changed) return { error: "Hội thoại vừa được đồng nghiệp nhận xử lý." };
  refreshInbox();
  return { ok: true };
}

export async function assignInboxConversation(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.assign");
  const id = formText(data, "conversationId");
  const assigneeId = formText(data, "assigneeId");
  await visibleConversation(id, user);
  const assignee = await prisma.user.findFirst({ where: { id: assigneeId, active: true }, select: { id: true } });
  if (!assignee) return { error: "Nhân viên không hợp lệ." };
  await prisma.$transaction([
    prisma.conversation.update({ where: { id }, data: { assigneeId, assignedById: user.id, assignedAt: new Date(), version: { increment: 1 } } }),
    prisma.conversationEvent.create({ data: { conversationId: id, actorId: user.id, type: "ASSIGNED", data: { assigneeId } } }),
  ]);
  refreshInbox();
  return { ok: true };
}

export async function setInboxStatus(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.assign");
  const id = formText(data, "conversationId");
  const status = formText(data, "status") as ConversationStatus;
  if (!(["OPEN", "SNOOZED", "CLOSED"] as string[]).includes(status)) return { error: "Trạng thái không hợp lệ." };
  await visibleConversation(id, user);
  const snoozeRaw = formText(data, "snoozedUntil");
  const snoozedUntil = status === "SNOOZED" && snoozeRaw ? new Date(snoozeRaw) : null;
  if (status === "SNOOZED" && (!snoozedUntil || Number.isNaN(snoozedUntil.getTime()))) return { error: "Thời gian tạm hoãn không hợp lệ." };
  await prisma.$transaction([
    prisma.conversation.update({ where: { id }, data: { status, snoozedUntil, closedAt: status === "CLOSED" ? new Date() : null, version: { increment: 1 } } }),
    prisma.conversationEvent.create({ data: { conversationId: id, actorId: user.id, type: "STATUS_CHANGED", data: { status, snoozedUntil: snoozedUntil?.toISOString() ?? null } } }),
  ]);
  refreshInbox();
  return { ok: true };
}

export async function addInboxNote(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.reply");
  const conversationId = formText(data, "conversationId");
  const content = formText(data, "content");
  await visibleConversation(conversationId, user);
  if (!content || content.length > 2000) return { error: "Ghi chú phải có từ 1 đến 2000 ký tự." };
  await prisma.conversationEvent.create({ data: { conversationId, actorId: user.id, type: "INTERNAL_NOTE", data: { content } } });
  refreshInbox();
  return { ok: true };
}

export async function linkInboxCustomer(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.linkCustomer");
  const conversationId = formText(data, "conversationId");
  const customerId = formText(data, "customerId");
  const conversation = await visibleConversation(conversationId, user);
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) return { error: "Không tìm thấy khách hàng." };
  await prisma.$transaction([
    prisma.channelContact.update({ where: { id: conversation.thread.channelContactId }, data: { customerId, linkedById: user.id, linkedAt: new Date() } }),
    prisma.conversationEvent.create({ data: { conversationId, actorId: user.id, type: "CUSTOMER_LINKED", data: { customerId } } }),
  ]);
  refreshInbox();
  return { ok: true };
}

type DeliveryContext = { messageId: string; accountId: string; provider: "ZALO_OA" | "FACEBOOK_PAGE"; externalAccountId: string; externalUserId: string; conversationId: string; content: string };

async function deliverText(context: DeliveryContext): Promise<InboxActionResult> {
  try {
    const sent = await withValidAccessToken(context.accountId, async (accessToken) => {
      const adapter = context.provider === "ZALO_OA" ? createZaloProvider() : createMetaProvider();
      return adapter.sendText({ externalAccountId: context.externalAccountId, externalUserId: context.externalUserId, accessToken, text: context.content });
    });
    await prisma.$transaction([
      prisma.inboxMessage.update({ where: { id: context.messageId }, data: { status: "SENT", providerMessageId: sent.providerMessageId, providerTimestamp: sent.timestamp, providerErrorCode: null, providerErrorMessage: null } }),
      prisma.conversation.updateMany({ where: { id: context.conversationId, firstResponseAt: null }, data: { firstResponseAt: sent.timestamp } }),
      prisma.channelThread.updateMany({ where: { conversations: { some: { id: context.conversationId } } }, data: { lastMessagePreview: context.content.slice(0, 240), lastMessageAt: sent.timestamp, lastOutboundAt: sent.timestamp } }),
    ]);
    return { ok: true };
  } catch (error) {
    const clean = error && typeof error === "object" ? error as { publicMessage?: unknown; code?: unknown } : {};
    const message = typeof clean.publicMessage === "string" ? clean.publicMessage : "Không gửi được tin nhắn. Vui lòng thử lại.";
    await prisma.inboxMessage.update({ where: { id: context.messageId }, data: { status: "FAILED", providerErrorCode: typeof clean.code === "string" ? clean.code : null, providerErrorMessage: message } });
    return { error: message };
  }
}

export async function sendInboxTextAction(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.reply");
  const conversationId = formText(data, "conversationId");
  const content = formText(data, "content");
  const clientNonce = formText(data, "clientNonce");
  if (!content || content.length > 2000 || !clientNonce) return { error: "Tin nhắn hoặc mã gửi không hợp lệ." };
  const duplicate = await prisma.inboxMessage.findUnique({ where: { clientNonce }, select: { status: true } });
  if (duplicate) return duplicate.status === "FAILED" ? { error: "Tin này đã gửi thất bại; hãy dùng nút Thử lại." } : { ok: true };
  const conversation = await visibleConversation(conversationId, user);
  if (conversation.assigneeId && conversation.assigneeId !== user.id) return { error: "Hội thoại đang thuộc nhân viên khác." };
  const pending = await prisma.$transaction(async (tx) => {
    if (!conversation.assigneeId) {
      const claimed = await tx.conversation.updateMany({ where: { id: conversationId, assigneeId: null, version: conversation.version }, data: { assigneeId: user.id, assignedAt: new Date(), assignedById: user.id, version: { increment: 1 } } });
      if (claimed.count !== 1) throw new Error("Hội thoại vừa được đồng nghiệp nhận xử lý.");
      await tx.conversationEvent.create({ data: { conversationId, actorId: user.id, type: "ASSIGNED", data: { assigneeId: user.id } } });
    }
    return tx.inboxMessage.create({ data: { channelAccountId: conversation.thread.channelAccountId, conversationId, clientNonce, direction: "OUT", type: "TEXT", status: "PENDING", content, sentById: user.id } });
  }).catch(async (error) => {
    const existing = await prisma.inboxMessage.findUnique({ where: { clientNonce } });
    if (existing) return existing;
    throw error;
  });
  if (pending.status !== "PENDING") return pending.status === "FAILED" ? { error: pending.providerErrorMessage ?? "Tin đã thất bại." } : { ok: true };
  const result = await deliverText({ messageId: pending.id, accountId: conversation.thread.channelAccountId, provider: conversation.thread.channelAccount.provider, externalAccountId: conversation.thread.channelAccount.externalAccountId, externalUserId: conversation.thread.channelContact.externalUserId, conversationId, content });
  refreshInbox();
  return result;
}

export async function retryInboxText(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.reply");
  const messageId = formText(data, "messageId");
  const message = await prisma.inboxMessage.findUnique({ where: { id: messageId }, include: { conversation: { include: { thread: { include: { channelAccount: true, channelContact: true } } } } } });
  if (!message || message.direction !== "OUT" || message.type !== "TEXT" || !message.content) return { error: "Tin nhắn không thể thử lại." };
  await visibleConversation(message.conversationId, user);
  await prisma.$transaction([
    prisma.inboxMessage.update({ where: { id: message.id }, data: { status: "PENDING", providerErrorCode: null, providerErrorMessage: null } }),
    prisma.conversationEvent.create({ data: { conversationId: message.conversationId, actorId: user.id, type: "SEND_RETRIED", data: { messageId } } }),
  ]);
  const result = await deliverText({ messageId, accountId: message.channelAccountId, provider: message.conversation.thread.channelAccount.provider, externalAccountId: message.conversation.thread.channelAccount.externalAccountId, externalUserId: message.conversation.thread.channelContact.externalUserId, conversationId: message.conversationId, content: message.content });
  refreshInbox();
  return result;
}

export async function heartbeatInboxPresence(data: FormData): Promise<InboxActionResult> {
  const user = await requireCap("inbox.view");
  const conversationId = formText(data, "conversationId");
  await visibleConversation(conversationId, user);
  await prisma.conversationPresence.upsert({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    create: { conversationId, userId: user.id, heartbeatAt: new Date(), isTyping: formText(data, "isTyping") === "true" },
    update: { heartbeatAt: new Date(), isTyping: formText(data, "isTyping") === "true" },
  });
  return { ok: true, nonce: Date.now() };
}

export async function wakeInboxSnoozed(): Promise<InboxActionResult> {
  await requireCap("inbox.view");
  await prisma.conversation.updateMany({ where: { status: "SNOOZED", snoozedUntil: { lte: new Date() } }, data: { status: "OPEN", snoozedUntil: null, version: { increment: 1 } } });
  return { ok: true };
}
