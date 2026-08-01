import { describe, expect, it, vi } from "vitest";
import { MemoryInboxStore, claimConversation, activePresence, filterInboxConversations, heartbeatPresence, linkInboxCustomer, sendInboxText, wakeSnoozedConversations } from "../inbox";

function store() {
  return new MemoryInboxStore([{ id: "c1", assigneeId: null, status: "OPEN", version: 0, firstResponseAt: null, snoozedUntil: null }]);
}

describe("inbox state machine", () => {
  it("first reply atomically claims an unassigned conversation", async () => {
    const memory = store();
    const provider = { sendText: vi.fn().mockResolvedValue({ providerMessageId: "out-1", timestamp: new Date() }) };
    const sent = await sendInboxText(memory, provider, { conversationId: "c1", actorId: "u1", content: "Chào chị", clientNonce: "n1" });
    expect(sent.status).toBe("SENT");
    expect(memory.conversations[0].assigneeId).toBe("u1");
    expect(memory.events.map((event) => event.type)).toEqual(["ASSIGNED"]);
    expect(memory.conversations[0].firstResponseAt).toBeInstanceOf(Date);
  });

  it("allows only one competing claim", async () => {
    const memory = store();
    const results = await Promise.all([claimConversation(memory, "c1", "u1"), claimConversation(memory, "c1", "u2")]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("deduplicates client nonce and retains provider failure", async () => {
    const memory = store();
    const provider = { sendText: vi.fn().mockRejectedValue(Object.assign(new Error("clean"), { publicMessage: "Không gửi được", code: "429" })) };
    const first = await sendInboxText(memory, provider, { conversationId: "c1", actorId: "u1", content: "Tin", clientNonce: "same" });
    const second = await sendInboxText(memory, provider, { conversationId: "c1", actorId: "u1", content: "Tin", clientNonce: "same" });
    expect(first.status).toBe("FAILED");
    expect(second.id).toBe(first.id);
    expect(memory.messages).toHaveLength(1);
    expect(memory.messages[0].providerErrorMessage).toBe("Không gửi được");
  });

  it("wakes snoozed conversations and expires presence after 15 seconds", async () => {
    const memory = store();
    memory.conversations[0].status = "SNOOZED";
    memory.conversations[0].snoozedUntil = new Date("2026-08-01T08:00:00Z");
    memory.presences.push({ conversationId: "c1", userId: "u1", heartbeatAt: new Date("2026-08-01T08:00:00Z"), isTyping: true });
    await wakeSnoozedConversations(memory, new Date("2026-08-01T08:00:01Z"));
    expect(memory.conversations[0].status).toBe("OPEN");
    expect(activePresence(memory.presences, new Date("2026-08-01T08:00:16Z"))).toEqual([]);
  });

  it("records customer-link audit and filters non-viewAll users", async () => {
    const memory = store();
    await linkInboxCustomer(memory, "c1", "customer-1", "u1", new Date("2026-08-01T08:00:00Z"));
    await heartbeatPresence(memory, "c1", "u1", true, new Date("2026-08-01T08:00:01Z"));
    expect(memory.events.at(-1)).toMatchObject({ type: "CUSTOMER_LINKED", data: { customerId: "customer-1" } });
    expect(activePresence(memory.presences, new Date("2026-08-01T08:00:10Z"))).toHaveLength(1);
    const conversations = [
      { id: "mine", assigneeId: "u1" },
      { id: "other", assigneeId: "u2" },
      { id: "free", assigneeId: null },
    ];
    expect(filterInboxConversations(conversations, { userId: "u1", viewAll: false, queue: "all" }).map((item) => item.id)).toEqual(["mine", "free"]);
    expect(filterInboxConversations(conversations, { userId: "u1", viewAll: true, queue: "all" })).toHaveLength(3);
  });
});
