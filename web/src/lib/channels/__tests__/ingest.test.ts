import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { handleMetaWebhook, verifyMetaWebhook } from "../../../app/api/channels/meta/webhook/route";
import { handleZaloWebhook } from "../../../app/api/channels/zalo/webhook/route";
import {
  MemoryChannelIngestionStore,
  eventReceipt,
  ingestChannelEvent,
} from "../ingest";
import type { NormalizedChannelEvent } from "../types";

const connectedAt = new Date("2026-08-01T00:00:00.000Z");

function store() {
  return new MemoryChannelIngestionStore([{
    id: "account-1",
    provider: "FACEBOOK_PAGE",
    externalAccountId: "page-1",
    connectedAt,
  }, {
    id: "account-2",
    provider: "ZALO_OA",
    externalAccountId: "oa-1",
    connectedAt,
  }]);
}

function inbound(overrides: Partial<Extract<NormalizedChannelEvent, { kind: "message.received" }>> = {}): Extract<NormalizedChannelEvent, { kind: "message.received" }> {
  return {
    kind: "message.received",
    provider: "FACEBOOK_PAGE",
    externalAccountId: "page-1",
    externalUserId: "psid-9",
    externalThreadId: "psid-9",
    providerMessageId: "mid.123",
    timestamp: new Date("2026-08-01T00:01:00.000Z"),
    message: { type: "TEXT", text: "Xin chào", attachments: [] },
    ...overrides,
  };
}

describe("ingestChannelEvent", () => {
  it("stores a repeated provider message once", async () => {
    const memory = store();
    const event = inbound();
    const receipt = eventReceipt(event);

    const first = await ingestChannelEvent(memory, event, receipt);
    const second = await ingestChannelEvent(memory, event, receipt);

    expect(first).toMatchObject({ duplicate: false });
    expect(second).toEqual({ duplicate: true });
    expect(memory.messages).toHaveLength(1);
    expect(memory.conversations).toHaveLength(1);
    expect(memory.threads[0].unreadCount).toBe(1);
  });

  it("ignores an event older than the channel connection cutoff", async () => {
    const memory = store();
    const event = inbound({ providerMessageId: "mid.old", timestamp: new Date("2026-07-31T23:59:59.000Z") });

    await expect(ingestChannelEvent(memory, event, eventReceipt(event))).resolves.toMatchObject({ ignored: true, duplicate: false });
    expect(memory.messages).toHaveLength(0);
    expect(memory.receipts).toHaveLength(1);
  });

  it("opens a new conversation cycle after the previous one was closed", async () => {
    const memory = store();
    const first = inbound();
    await ingestChannelEvent(memory, first, eventReceipt(first));
    memory.conversations[0].status = "CLOSED";

    const next = inbound({ providerMessageId: "mid.124", timestamp: new Date("2026-08-01T00:02:00.000Z") });
    await ingestChannelEvent(memory, next, eventReceipt(next));
    const delivered: NormalizedChannelEvent = {
      kind: "message.delivered",
      provider: "FACEBOOK_PAGE",
      externalAccountId: "page-1",
      externalUserId: "psid-9",
      externalThreadId: "psid-9",
      providerMessageId: "mid.outbound",
      timestamp: new Date("2026-08-01T00:02:30.000Z"),
    };
    await ingestChannelEvent(memory, delivered, eventReceipt(delivered));

    expect(memory.conversations).toHaveLength(2);
    expect(memory.messages).toHaveLength(2);
    expect(memory.threads[0].unreadCount).toBe(2);
  });

  it("purges provider identity and message data when consent is withdrawn", async () => {
    const memory = store();
    const message = inbound();
    await ingestChannelEvent(memory, message, eventReceipt(message));
    const withdrawn: NormalizedChannelEvent = {
      kind: "contact.withdrawn",
      provider: "FACEBOOK_PAGE",
      externalAccountId: "page-1",
      externalUserId: "psid-9",
      externalThreadId: "psid-9",
      timestamp: new Date("2026-08-01T00:03:00.000Z"),
    };

    await ingestChannelEvent(memory, withdrawn, eventReceipt(withdrawn));

    expect(memory.contacts).toHaveLength(0);
    expect(memory.threads).toHaveLength(0);
    expect(memory.conversations).toHaveLength(0);
    expect(memory.messages).toHaveLength(0);
    expect(memory.receipts).toHaveLength(2);
    expect(memory.receipts.every((receipt) => !JSON.stringify(receipt).includes("Xin chào"))).toBe(true);
    expect(memory.receipts.every((receipt) => !JSON.stringify(receipt).includes("psid-9"))).toBe(true);
  });
});

describe("webhook route handlers", () => {
  it("verifies Meta challenge and stores a duplicate POST once", async () => {
    const memory = store();
    const challenge = await verifyMetaWebhook(new Request("https://zenith.test/api/channels/meta/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123"), "verify-me");
    expect(await challenge.text()).toBe("abc123");

    const body = JSON.stringify({ object: "page", entry: [{ id: "page-1", messaging: [{ sender: { id: "psid-9" }, recipient: { id: "page-1" }, timestamp: Date.parse("2026-08-01T00:01:00.000Z"), message: { mid: "mid.route", text: "Mới" } }] }] });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    const request = () => new Request("https://zenith.test/api/channels/meta/webhook", { method: "POST", headers: { "x-hub-signature-256": signature }, body });

    expect((await handleMetaWebhook(request(), { store: memory, appSecret: "app-secret" })).status).toBe(200);
    expect((await handleMetaWebhook(request(), { store: memory, appSecret: "app-secret" })).status).toBe(200);
    expect(memory.messages).toHaveLength(1);

    const unknownBody = JSON.stringify({ object: "page", entry: [{ id: "page-1", messaging: [{ sender: { id: "psid-9" }, recipient: { id: "page-1" }, timestamp: Date.parse("2026-08-01T00:02:00.000Z"), postback: { payload: "unknown" } }] }] });
    const unknownSignature = `sha256=${createHmac("sha256", "app-secret").update(unknownBody).digest("hex")}`;
    const unknown = new Request("https://zenith.test/api/channels/meta/webhook", { method: "POST", headers: { "x-hub-signature-256": unknownSignature }, body: unknownBody });
    expect((await handleMetaWebhook(unknown, { store: memory, appSecret: "app-secret" })).status).toBe(200);
    expect(memory.messages).toHaveLength(1);

    const bad = new Request("https://zenith.test/api/channels/meta/webhook", { method: "POST", headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) }, body });
    expect((await handleMetaWebhook(bad, { store: memory, appSecret: "app-secret" })).status).toBe(401);
  });

  it("accepts a signed Zalo raw body and rejects malformed JSON", async () => {
    const memory = store();
    const timestamp = String(Date.parse("2026-08-01T00:01:00.000Z"));
    const body = JSON.stringify({ event_name: "user_send_text", oa_id: "oa-1", sender: { id: "uid-9" }, timestamp, message: { msg_id: "z.route", text: "Mới" } });
    const digest = createHash("sha256").update("app-id" + body + timestamp + "oa-secret").digest("hex");
    const request = new Request("https://zenith.test/api/channels/zalo/webhook", { method: "POST", headers: { "x-zevent-signature": `mac=${digest}` }, body });

    expect((await handleZaloWebhook(request, { store: memory, appId: "app-id", oaSecret: "oa-secret" })).status).toBe(200);
    expect(memory.messages).toHaveLength(1);

    const malformed = "{";
    const malformedSig = createHash("sha256").update("app-id" + malformed + "1" + "oa-secret").digest("hex");
    const badRequest = new Request("https://zenith.test/api/channels/zalo/webhook", { method: "POST", headers: { "x-zevent-signature": `mac=${malformedSig}`, "x-zevent-timestamp": "1" }, body: malformed });
    expect((await handleZaloWebhook(badRequest, { store: memory, appId: "app-id", oaSecret: "oa-secret" })).status).toBe(400);
  });
});
