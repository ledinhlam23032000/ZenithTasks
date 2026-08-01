import { describe, expect, it, vi } from "vitest";
import { ChannelProviderError } from "../types";
import { createMetaProvider, normalizeMetaWebhook } from "../providers/meta";

describe("normalizeMetaWebhook", () => {
  it("normalizes inbound text and image messages", () => {
    const fixture = {
      object: "page",
      entry: [{
        id: "page-1",
        messaging: [
          {
            sender: { id: "psid-9" },
            recipient: { id: "page-1" },
            timestamp: 1722500000000,
            message: { mid: "mid.123", text: "Xin chào" },
          },
          {
            sender: { id: "psid-9" },
            recipient: { id: "page-1" },
            timestamp: 1722500001000,
            message: {
              mid: "mid.124",
              attachments: [{ type: "image", payload: { url: "https://cdn.example/photo.jpg" } }],
            },
          },
        ],
      }],
    };

    expect(normalizeMetaWebhook(fixture)).toEqual([
      {
        kind: "message.received",
        provider: "FACEBOOK_PAGE",
        externalAccountId: "page-1",
        externalUserId: "psid-9",
        externalThreadId: "psid-9",
        providerMessageId: "mid.123",
        timestamp: new Date(1722500000000),
        message: { type: "TEXT", text: "Xin chào", attachments: [] },
      },
      {
        kind: "message.received",
        provider: "FACEBOOK_PAGE",
        externalAccountId: "page-1",
        externalUserId: "psid-9",
        externalThreadId: "psid-9",
        providerMessageId: "mid.124",
        timestamp: new Date(1722500001000),
        message: {
          type: "IMAGE",
          text: null,
          attachments: [{ type: "IMAGE", url: "https://cdn.example/photo.jpg" }],
        },
      },
    ]);
  });

  it("ignores echo and unknown signed events", () => {
    expect(normalizeMetaWebhook({ object: "page", entry: [{ id: "p", messaging: [{ message: { is_echo: true } }] }] })).toEqual([]);
    expect(normalizeMetaWebhook({ object: "page", entry: [{ id: "p", messaging: [{ postback: { payload: "x" } }] }] })).toEqual([]);
  });
});

describe("Meta provider outbound", () => {
  it("sends RESPONSE text with a bearer Page token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ recipient_id: "psid-9", message_id: "mid.out" }));
    const provider = createMetaProvider({ fetch: fetchMock, graphVersion: "v23.0" });

    const result = await provider.sendText({
      externalAccountId: "page-1",
      externalUserId: "psid-9",
      accessToken: "page-token-secret",
      text: "Chào anh/chị",
    });

    expect(result.providerMessageId).toBe("mid.out");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/page-1/messages");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer page-token-secret");
    expect(JSON.parse(String(init.body))).toEqual({
      recipient: { id: "psid-9" },
      messaging_type: "RESPONSE",
      message: { text: "Chào anh/chị" },
    });
  });

  it("uploads a JPEG and sends its reusable attachment id", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ attachment_id: "att-1" }))
      .mockResolvedValueOnce(Response.json({ message_id: "mid.image" }));
    const provider = createMetaProvider({ fetch: fetchMock, graphVersion: "v23.0" });
    const common = { externalAccountId: "page-1", externalUserId: "psid-9", accessToken: "token" };

    const uploaded = await provider.uploadAttachment({ ...common, file: new Blob(["jpeg"], { type: "image/jpeg" }), fileName: "photo.jpg" });
    await provider.sendAttachment({ ...common, attachmentType: "IMAGE", providerAttachmentId: uploaded.providerAttachmentId });

    expect(uploaded).toEqual({ providerAttachmentId: "att-1", attachmentType: "IMAGE" });
    const [uploadUrl, uploadInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(uploadUrl).toBe("https://graph.facebook.com/v23.0/page-1/message_attachments");
    expect(uploadInit.body).toBeInstanceOf(FormData);
    const [, sendInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(sendInit.body))).toMatchObject({
      message: { attachment: { type: "image", payload: { attachment_id: "att-1" } } },
    });
  });

  it("maps 401 to a sanitized reauthentication error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":{"message":"token page-token-secret expired"}}', { status: 401 }));
    const provider = createMetaProvider({ fetch: fetchMock, graphVersion: "v23.0" });

    try {
      await provider.sendText({ externalAccountId: "p", externalUserId: "u", accessToken: "page-token-secret", text: "x" });
      throw new Error("expected provider error");
    } catch (error) {
      expect(error).toBeInstanceOf(ChannelProviderError);
      const providerError = error as ChannelProviderError;
      expect(providerError.reauthRequired).toBe(true);
      expect(providerError.publicMessage).not.toContain("page-token-secret");
    }
  });
});
