import { createHash, randomUUID } from "node:crypto";
import type { ChannelProviderName, NormalizedChannelEvent } from "./types";
import type { NormalizedAttachment } from "./types";
import { encryptChannelSecret } from "./crypto";

export type WebhookReceiptInput = {
  provider: ChannelProviderName;
  externalAccountId: string;
  eventKey: string;
  sanitizedPayload: Record<string, string | null>;
  receivedAt: Date;
};

export type IngestionResult = {
  duplicate: boolean;
  ignored?: boolean;
  conversationId?: string;
};

type AccountRecord = {
  id: string;
  provider: ChannelProviderName;
  externalAccountId: string;
  connectedAt: Date;
};

type ContactRecord = { id: string; channelAccountId: string; externalUserId: string };
type ThreadRecord = {
  id: string;
  channelAccountId: string;
  channelContactId: string;
  externalThreadId: string;
};
type ConversationRecord = { id: string; threadId: string; status: "OPEN" | "SNOOZED" | "CLOSED" };

export interface ChannelIngestionTransaction {
  findAccount(provider: ChannelProviderName, externalAccountId: string): Promise<AccountRecord | null>;
  createReceipt(receipt: WebhookReceiptInput, channelAccountId: string | null): Promise<string | null>;
  completeReceipt(receiptId: string): Promise<void>;
  touchAccount(channelAccountId: string, timestamp: Date): Promise<void>;
  upsertContact(channelAccountId: string, externalUserId: string, timestamp: Date): Promise<ContactRecord>;
  upsertThread(channelAccountId: string, channelContactId: string, externalThreadId: string): Promise<ThreadRecord>;
  findActiveConversation(threadId: string): Promise<ConversationRecord | null>;
  createConversation(threadId: string, openedAt: Date): Promise<ConversationRecord>;
  createInboundMessage(input: {
    channelAccountId: string;
    conversationId: string;
    providerMessageId: string;
    type: "TEXT" | "IMAGE" | "FILE" | "STICKER" | "UNSUPPORTED";
    content: string | null;
    providerTimestamp: Date;
    attachments: NormalizedAttachment[];
  }): Promise<void>;
  updateThreadInbound(threadId: string, preview: string, timestamp: Date): Promise<void>;
  updateOutboundStatus(input: {
    channelAccountId: string;
    externalThreadId: string;
    providerMessageId: string | null;
    status: "DELIVERED" | "READ";
    timestamp: Date;
  }): Promise<void>;
  purgeContact(channelAccountId: string, externalUserId: string): Promise<void>;
}

export interface ChannelIngestionStore {
  transaction<T>(operation: (tx: ChannelIngestionTransaction) => Promise<T>): Promise<T>;
}

export function eventReceipt(event: NormalizedChannelEvent, receivedAt = new Date()): WebhookReceiptInput {
  const providerMessageId = "providerMessageId" in event ? event.providerMessageId : null;
  const discriminator = providerMessageId ?? createHash("sha256")
    .update(`${event.externalUserId}:${event.timestamp.toISOString()}`)
    .digest("hex");
  return {
    provider: event.provider,
    externalAccountId: event.externalAccountId,
    eventKey: `${event.kind}:${discriminator}`,
    sanitizedPayload: { kind: event.kind, providerMessageId },
    receivedAt,
  };
}

function preview(event: Extract<NormalizedChannelEvent, { kind: "message.received" }>): string {
  if (event.message.text) return event.message.text.slice(0, 240);
  if (event.message.type === "IMAGE") return "[Hình ảnh]";
  if (event.message.type === "FILE") return "[Tệp đính kèm]";
  if (event.message.type === "STICKER") return "[Sticker]";
  return "[Nội dung chưa hỗ trợ]";
}

export async function ingestChannelEvent(
  store: ChannelIngestionStore,
  event: NormalizedChannelEvent,
  receipt: WebhookReceiptInput,
): Promise<IngestionResult> {
  return store.transaction(async (tx) => {
    const account = await tx.findAccount(event.provider, event.externalAccountId);
    const receiptId = await tx.createReceipt(receipt, account?.id ?? null);
    if (!receiptId) return { duplicate: true };

    if (!account || event.timestamp < account.connectedAt) {
      await tx.completeReceipt(receiptId);
      return { duplicate: false, ignored: true };
    }

    await tx.touchAccount(account.id, receipt.receivedAt);

    if (event.kind === "contact.withdrawn") {
      await tx.purgeContact(account.id, event.externalUserId);
      await tx.completeReceipt(receiptId);
      return { duplicate: false };
    }

    if (event.kind === "message.delivered" || event.kind === "message.read") {
      await tx.updateOutboundStatus({
        channelAccountId: account.id,
        externalThreadId: event.externalThreadId,
        providerMessageId: event.providerMessageId,
        status: event.kind === "message.read" ? "READ" : "DELIVERED",
        timestamp: event.timestamp,
      });
      await tx.completeReceipt(receiptId);
      return { duplicate: false };
    }

    if (event.kind !== "message.received") {
      await tx.completeReceipt(receiptId);
      return { duplicate: false, ignored: true };
    }

    const contact = await tx.upsertContact(account.id, event.externalUserId, event.timestamp);
    const thread = await tx.upsertThread(account.id, contact.id, event.externalThreadId);
    const conversation = await tx.findActiveConversation(thread.id)
      ?? await tx.createConversation(thread.id, event.timestamp);
    await tx.createInboundMessage({
      channelAccountId: account.id,
      conversationId: conversation.id,
      providerMessageId: event.providerMessageId,
      type: event.message.type,
      content: event.message.text,
      providerTimestamp: event.timestamp,
      attachments: event.message.attachments,
    });
    await tx.updateThreadInbound(thread.id, preview(event), event.timestamp);
    await tx.completeReceipt(receiptId);
    return { duplicate: false, conversationId: conversation.id };
  });
}

type MemoryReceipt = WebhookReceiptInput & { id: string; channelAccountId: string | null; status: "RECEIVED" | "PROCESSED" };
type MemoryContact = ContactRecord & { lastSeenAt: Date };
type MemoryThread = ThreadRecord & { unreadCount: number; lastMessagePreview: string | null; lastMessageAt: Date | null };
type MemoryConversation = ConversationRecord & { openedAt: Date };
type MemoryMessage = {
  id: string;
  channelAccountId: string;
  conversationId: string;
  providerMessageId: string;
  type: "TEXT" | "IMAGE" | "FILE" | "STICKER" | "UNSUPPORTED";
  content: string | null;
  status: "RECEIVED" | "DELIVERED" | "READ";
  providerTimestamp: Date;
};

export class MemoryChannelIngestionStore implements ChannelIngestionStore {
  readonly accounts: AccountRecord[];
  readonly receipts: MemoryReceipt[] = [];
  readonly contacts: MemoryContact[] = [];
  readonly threads: MemoryThread[] = [];
  readonly conversations: MemoryConversation[] = [];
  readonly messages: MemoryMessage[] = [];

  constructor(accounts: AccountRecord[]) {
    this.accounts = accounts.map((account) => ({ ...account }));
  }

  async transaction<T>(operation: (tx: ChannelIngestionTransaction) => Promise<T>): Promise<T> {
    const id = () => randomUUID();
    const tx: ChannelIngestionTransaction = {
      findAccount: async (provider, externalAccountId) => this.accounts.find((item) => item.provider === provider && item.externalAccountId === externalAccountId) ?? null,
      createReceipt: async (receipt, channelAccountId) => {
        if (this.receipts.some((item) => item.provider === receipt.provider && item.externalAccountId === receipt.externalAccountId && item.eventKey === receipt.eventKey)) return null;
        const receiptId = id();
        this.receipts.push({ ...receipt, id: receiptId, channelAccountId, status: "RECEIVED" });
        return receiptId;
      },
      completeReceipt: async (receiptId) => {
        const receipt = this.receipts.find((item) => item.id === receiptId);
        if (receipt) receipt.status = "PROCESSED";
      },
      touchAccount: async () => undefined,
      upsertContact: async (channelAccountId, externalUserId, timestamp) => {
        let contact = this.contacts.find((item) => item.channelAccountId === channelAccountId && item.externalUserId === externalUserId);
        if (!contact) {
          contact = { id: id(), channelAccountId, externalUserId, lastSeenAt: timestamp };
          this.contacts.push(contact);
        } else contact.lastSeenAt = timestamp;
        return contact;
      },
      upsertThread: async (channelAccountId, channelContactId, externalThreadId) => {
        let thread = this.threads.find((item) => item.channelAccountId === channelAccountId && item.externalThreadId === externalThreadId);
        if (!thread) {
          thread = { id: id(), channelAccountId, channelContactId, externalThreadId, unreadCount: 0, lastMessagePreview: null, lastMessageAt: null };
          this.threads.push(thread);
        }
        return thread;
      },
      findActiveConversation: async (threadId) => this.conversations.find((item) => item.threadId === threadId && item.status !== "CLOSED") ?? null,
      createConversation: async (threadId, openedAt) => {
        const conversation: MemoryConversation = { id: id(), threadId, status: "OPEN", openedAt };
        this.conversations.push(conversation);
        return conversation;
      },
      createInboundMessage: async (input) => {
        if (this.messages.some((item) => item.channelAccountId === input.channelAccountId && item.providerMessageId === input.providerMessageId)) return;
        this.messages.push({ id: id(), ...input, status: "RECEIVED" });
      },
      updateThreadInbound: async (threadId, messagePreview, timestamp) => {
        const thread = this.threads.find((item) => item.id === threadId);
        if (!thread) return;
        thread.lastMessagePreview = messagePreview;
        thread.lastMessageAt = timestamp;
        thread.unreadCount += 1;
      },
      updateOutboundStatus: async ({ channelAccountId, providerMessageId, status, timestamp }) => {
        for (const message of this.messages) {
          if (message.channelAccountId !== channelAccountId) continue;
          if (providerMessageId ? message.providerMessageId === providerMessageId : message.providerTimestamp <= timestamp) message.status = status;
        }
      },
      purgeContact: async (channelAccountId, externalUserId) => {
        const contactIds = this.contacts.filter((item) => item.channelAccountId === channelAccountId && item.externalUserId === externalUserId).map((item) => item.id);
        const threadIds = this.threads.filter((item) => contactIds.includes(item.channelContactId)).map((item) => item.id);
        const conversationIds = this.conversations.filter((item) => threadIds.includes(item.threadId)).map((item) => item.id);
        this.messages.splice(0, this.messages.length, ...this.messages.filter((item) => !conversationIds.includes(item.conversationId)));
        this.conversations.splice(0, this.conversations.length, ...this.conversations.filter((item) => !threadIds.includes(item.threadId)));
        this.threads.splice(0, this.threads.length, ...this.threads.filter((item) => !contactIds.includes(item.channelContactId)));
        this.contacts.splice(0, this.contacts.length, ...this.contacts.filter((item) => !contactIds.includes(item.id)));
      },
    };
    return operation(tx);
  }
}

type Delegate = {
  findUnique(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<{ count: number }>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
};

type PrismaTransactionLike = {
  channelAccount: Delegate;
  channelContact: Delegate;
  channelThread: Delegate;
  conversation: Delegate;
  inboxMessage: Delegate;
  webhookReceipt: Delegate;
};

export type PrismaIngestionClient = {
  $transaction<T>(operation: (tx: PrismaTransactionLike) => Promise<T>): Promise<T>;
};

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dữ liệu hộp thư không hợp lệ.");
  return value as Record<string, unknown>;
}

function idOf(value: unknown): string {
  const id = row(value).id;
  if (typeof id !== "string") throw new Error("Bản ghi hộp thư thiếu ID.");
  return id;
}

export function createPrismaIngestionStore(client: PrismaIngestionClient): ChannelIngestionStore {
  return {
    transaction: (operation) => client.$transaction(async (db) => operation({
      async findAccount(provider, externalAccountId) {
        const found = await db.channelAccount.findUnique({ where: { provider_externalAccountId: { provider, externalAccountId } }, select: { id: true, provider: true, externalAccountId: true, connectedAt: true } });
        if (!found) return null;
        const value = row(found);
        return { id: String(value.id), provider: value.provider as ChannelProviderName, externalAccountId: String(value.externalAccountId), connectedAt: value.connectedAt as Date };
      },
      async createReceipt(receipt, channelAccountId) {
        const id = randomUUID();
        const result = await db.webhookReceipt.createMany({
          data: [{ id, provider: receipt.provider, externalAccountId: receipt.externalAccountId, channelAccountId, eventKey: receipt.eventKey, sanitizedPayload: receipt.sanitizedPayload, payloadExpiresAt: new Date(receipt.receivedAt.getTime() + 7 * 24 * 60 * 60 * 1000), receivedAt: receipt.receivedAt }],
          skipDuplicates: true,
        });
        return result.count === 1 ? id : null;
      },
      async completeReceipt(receiptId) {
        await db.webhookReceipt.update({ where: { id: receiptId }, data: { status: "PROCESSED", processedAt: new Date() } });
      },
      async touchAccount(channelAccountId, timestamp) {
        await db.channelAccount.update({ where: { id: channelAccountId }, data: { lastWebhookAt: timestamp } });
      },
      async upsertContact(channelAccountId, externalUserId, timestamp) {
        const contact = await db.channelContact.upsert({
          where: { channelAccountId_externalUserId: { channelAccountId, externalUserId } },
          create: { channelAccountId, externalUserId, lastSeenAt: timestamp },
          update: { lastSeenAt: timestamp, consentWithdrawnAt: null },
          select: { id: true, channelAccountId: true, externalUserId: true },
        });
        const value = row(contact);
        return { id: String(value.id), channelAccountId: String(value.channelAccountId), externalUserId: String(value.externalUserId) };
      },
      async upsertThread(channelAccountId, channelContactId, externalThreadId) {
        const thread = await db.channelThread.upsert({
          where: { channelAccountId_externalThreadId: { channelAccountId, externalThreadId } },
          create: { channelAccountId, channelContactId, externalThreadId },
          update: { channelContactId },
          select: { id: true, channelAccountId: true, channelContactId: true, externalThreadId: true },
        });
        const value = row(thread);
        return { id: String(value.id), channelAccountId: String(value.channelAccountId), channelContactId: String(value.channelContactId), externalThreadId: String(value.externalThreadId) };
      },
      async findActiveConversation(threadId) {
        const found = await db.conversation.findFirst({ where: { threadId, status: { not: "CLOSED" } }, orderBy: { openedAt: "desc" }, select: { id: true, threadId: true, status: true } });
        if (!found) return null;
        const value = row(found);
        return { id: String(value.id), threadId: String(value.threadId), status: value.status as ConversationRecord["status"] };
      },
      async createConversation(threadId, openedAt) {
        const created = await db.conversation.create({ data: { threadId, openedAt }, select: { id: true, threadId: true, status: true } });
        const value = row(created);
        return { id: String(value.id), threadId: String(value.threadId), status: value.status as ConversationRecord["status"] };
      },
      async createInboundMessage(input) {
        const { attachments, ...message } = input;
        await db.inboxMessage.create({
          data: {
            ...message,
            direction: "IN",
            status: "RECEIVED",
            attachments: attachments.length > 0 ? { create: attachments.map((attachment) => ({
              channelAccountId: input.channelAccountId,
              providerAttachmentId: attachment.providerAttachmentId,
              providerUrlEnc: attachment.url ? encryptChannelSecret(attachment.url) : null,
              originalName: attachment.name,
              status: "PENDING",
            })) } : undefined,
          },
        });
      },
      async updateThreadInbound(threadId, messagePreview, timestamp) {
        await db.channelThread.update({ where: { id: threadId }, data: { lastMessagePreview: messagePreview, lastMessageAt: timestamp, lastInboundAt: timestamp, unreadCount: { increment: 1 } } });
      },
      async updateOutboundStatus({ channelAccountId, externalThreadId, providerMessageId, status, timestamp }) {
        const thread = await db.channelThread.findUnique({ where: { channelAccountId_externalThreadId: { channelAccountId, externalThreadId } }, select: { id: true } });
        if (!thread) return;
        const threadId = idOf(thread);
        await db.inboxMessage.updateMany({
          where: providerMessageId
            ? { channelAccountId, providerMessageId, direction: "OUT" }
            : { channelAccountId, direction: "OUT", conversation: { threadId }, providerTimestamp: { lte: timestamp } },
          data: { status },
        });
      },
      async purgeContact(channelAccountId, externalUserId) {
        await db.channelContact.deleteMany({ where: { channelAccountId, externalUserId } });
      },
    })),
  };
}
