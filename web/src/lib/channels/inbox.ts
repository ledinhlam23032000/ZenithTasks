import { randomUUID } from "node:crypto";

export type InboxConversationState = {
  id: string;
  assigneeId: string | null;
  status: "OPEN" | "SNOOZED" | "CLOSED";
  version: number;
  firstResponseAt: Date | null;
  snoozedUntil: Date | null;
};

export type InboxMessageState = {
  id: string;
  conversationId: string;
  clientNonce: string;
  content: string;
  status: "PENDING" | "SENT" | "FAILED";
  providerMessageId: string | null;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  sentById: string;
  createdAt: Date;
};

export type InboxEventState = {
  id: string;
  conversationId: string;
  actorId: string | null;
  type: "ASSIGNED" | "STATUS_CHANGED" | "INTERNAL_NOTE" | "CUSTOMER_LINKED" | "SEND_RETRIED";
  data?: Record<string, unknown>;
  createdAt: Date;
};

export type InboxPresenceState = {
  conversationId: string;
  userId: string;
  heartbeatAt: Date;
  isTyping: boolean;
};

export interface InboxStore {
  getConversation(id: string): Promise<InboxConversationState | null>;
  claimIfUnassigned(id: string, actorId: string, expectedVersion: number, now: Date): Promise<boolean>;
  findMessageByNonce(clientNonce: string): Promise<InboxMessageState | null>;
  createPendingMessage(input: Omit<InboxMessageState, "id" | "status" | "providerMessageId" | "providerErrorCode" | "providerErrorMessage">): Promise<InboxMessageState>;
  markMessageSent(id: string, providerMessageId: string, timestamp: Date): Promise<InboxMessageState>;
  markMessageFailed(id: string, code: string | null, publicMessage: string): Promise<InboxMessageState>;
  setFirstResponse(id: string, timestamp: Date): Promise<void>;
  addEvent(input: Omit<InboxEventState, "id">): Promise<void>;
  wakeSnoozed(now: Date): Promise<number>;
  linkCustomer(conversationId: string, customerId: string): Promise<void>;
  upsertPresence(input: InboxPresenceState): Promise<void>;
}

export type InboxSendProvider = {
  sendText(input: { conversationId: string; text: string }): Promise<{ providerMessageId: string; timestamp: Date }>;
};

export async function claimConversation(
  store: InboxStore,
  conversationId: string,
  actorId: string,
  now = new Date(),
): Promise<{ ok: boolean; collision?: boolean }> {
  const conversation = await store.getConversation(conversationId);
  if (!conversation) return { ok: false };
  if (conversation.assigneeId === actorId) return { ok: true };
  if (conversation.assigneeId) return { ok: false, collision: true };
  const claimed = await store.claimIfUnassigned(conversationId, actorId, conversation.version, now);
  if (!claimed) return { ok: false, collision: true };
  await store.addEvent({ conversationId, actorId, type: "ASSIGNED", data: { assigneeId: actorId }, createdAt: now });
  return { ok: true };
}

export async function sendInboxText(
  store: InboxStore,
  provider: InboxSendProvider,
  input: { conversationId: string; actorId: string; content: string; clientNonce: string },
  now = new Date(),
): Promise<InboxMessageState> {
  const existing = await store.findMessageByNonce(input.clientNonce);
  if (existing) return existing;
  const content = input.content.trim();
  if (!content || content.length > 2000) throw new Error("Tin nhắn phải có từ 1 đến 2000 ký tự.");
  const claim = await claimConversation(store, input.conversationId, input.actorId, now);
  if (!claim.ok) throw new Error("Hội thoại vừa được đồng nghiệp nhận xử lý.");
  const pending = await store.createPendingMessage({
    conversationId: input.conversationId,
    clientNonce: input.clientNonce,
    content,
    sentById: input.actorId,
    createdAt: now,
  });
  try {
    const sent = await provider.sendText({ conversationId: input.conversationId, text: content });
    const result = await store.markMessageSent(pending.id, sent.providerMessageId, sent.timestamp);
    await store.setFirstResponse(input.conversationId, sent.timestamp);
    return result;
  } catch (error) {
    const clean = error && typeof error === "object" ? error as { publicMessage?: unknown; code?: unknown } : {};
    const publicMessage = typeof clean.publicMessage === "string" ? clean.publicMessage : "Không gửi được tin nhắn. Vui lòng thử lại.";
    const code = typeof clean.code === "string" ? clean.code : null;
    return store.markMessageFailed(pending.id, code, publicMessage);
  }
}

export async function wakeSnoozedConversations(store: InboxStore, now = new Date()): Promise<number> {
  return store.wakeSnoozed(now);
}

export function activePresence(presences: InboxPresenceState[], now = new Date()): InboxPresenceState[] {
  const cutoff = now.getTime() - 15_000;
  return presences.filter((presence) => presence.heartbeatAt.getTime() > cutoff);
}

export async function linkInboxCustomer(store: InboxStore, conversationId: string, customerId: string, actorId: string, now = new Date()): Promise<void> {
  await store.linkCustomer(conversationId, customerId);
  await store.addEvent({ conversationId, actorId, type: "CUSTOMER_LINKED", data: { customerId }, createdAt: now });
}

export async function heartbeatPresence(store: InboxStore, conversationId: string, userId: string, isTyping: boolean, now = new Date()): Promise<void> {
  await store.upsertPresence({ conversationId, userId, isTyping, heartbeatAt: now });
}

export function filterInboxConversations<T extends { assigneeId: string | null }>(
  conversations: T[],
  input: { userId: string; viewAll: boolean; queue: "unassigned" | "mine" | "all" },
): T[] {
  return conversations.filter((conversation) => {
    if (input.queue === "unassigned") return conversation.assigneeId === null;
    if (input.queue === "mine") return conversation.assigneeId === input.userId;
    return input.viewAll || conversation.assigneeId === null || conversation.assigneeId === input.userId;
  });
}

export class MemoryInboxStore implements InboxStore {
  readonly conversations: InboxConversationState[];
  readonly messages: InboxMessageState[] = [];
  readonly events: InboxEventState[] = [];
  readonly presences: InboxPresenceState[] = [];

  constructor(conversations: InboxConversationState[]) {
    this.conversations = conversations.map((conversation) => ({ ...conversation }));
  }

  async getConversation(id: string) { return this.conversations.find((item) => item.id === id) ?? null; }
  async claimIfUnassigned(id: string, actorId: string, expectedVersion: number) {
    const item = this.conversations.find((conversation) => conversation.id === id);
    if (!item || item.assigneeId || item.version !== expectedVersion) return false;
    item.assigneeId = actorId;
    item.version += 1;
    return true;
  }
  async findMessageByNonce(clientNonce: string) { return this.messages.find((message) => message.clientNonce === clientNonce) ?? null; }
  async createPendingMessage(input: Omit<InboxMessageState, "id" | "status" | "providerMessageId" | "providerErrorCode" | "providerErrorMessage">) {
    const message: InboxMessageState = { id: randomUUID(), ...input, status: "PENDING", providerMessageId: null, providerErrorCode: null, providerErrorMessage: null };
    this.messages.push(message);
    return message;
  }
  async markMessageSent(id: string, providerMessageId: string) {
    const message = this.messages.find((item) => item.id === id);
    if (!message) throw new Error("Không tìm thấy tin nhắn.");
    message.status = "SENT";
    message.providerMessageId = providerMessageId;
    return message;
  }
  async markMessageFailed(id: string, code: string | null, publicMessage: string) {
    const message = this.messages.find((item) => item.id === id);
    if (!message) throw new Error("Không tìm thấy tin nhắn.");
    message.status = "FAILED";
    message.providerErrorCode = code;
    message.providerErrorMessage = publicMessage;
    return message;
  }
  async setFirstResponse(id: string, timestamp: Date) {
    const item = this.conversations.find((conversation) => conversation.id === id);
    if (item && !item.firstResponseAt) item.firstResponseAt = timestamp;
  }
  async addEvent(input: Omit<InboxEventState, "id">) { this.events.push({ id: randomUUID(), ...input }); }
  async linkCustomer() { return undefined; }
  async upsertPresence(input: InboxPresenceState) {
    const existing = this.presences.find((item) => item.conversationId === input.conversationId && item.userId === input.userId);
    if (existing) Object.assign(existing, input);
    else this.presences.push({ ...input });
  }
  async wakeSnoozed(now: Date) {
    let count = 0;
    for (const item of this.conversations) {
      if (item.status === "SNOOZED" && item.snoozedUntil && item.snoozedUntil <= now) {
        item.status = "OPEN";
        item.snoozedUntil = null;
        item.version += 1;
        count += 1;
      }
    }
    return count;
  }
}
