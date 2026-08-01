import { describe, expect, it, vi } from "vitest";
import { ChannelProviderError } from "../types";
import { createZaloProvider, normalizeZaloWebhook } from "../providers/zalo";

describe("normalizeZaloWebhook", () => {
  it("normalizes text, image, file and sticker literals", () => {
    const base = { oa_id: "oa-1", sender: { id: "uid-9" }, timestamp: "1722500000000" };

    expect(normalizeZaloWebhook({ ...base, event_name: "user_send_text", message: { msg_id: "z1", text: "Xin chào" } })).toEqual([{
      kind: "message.received",
      provider: "ZALO_OA",
      externalAccountId: "oa-1",
      externalUserId: "uid-9",
      externalThreadId: "uid-9",
      providerMessageId: "z1",
      timestamp: new Date(1722500000000),
      message: { type: "TEXT", text: "Xin chào", attachments: [] },
    }]);

    const cases = [
      ["user_send_image", "IMAGE", { type: "image", payload: { url: "https://zalo/image.jpg" } }],
      ["user_send_file", "FILE", { type: "file", payload: { url: "https://zalo/file.pdf", name: "bao-gia.pdf" } }],
      ["user_send_sticker", "STICKER", { type: "sticker", payload: { id: "sticker-7" } }],
    ] as const;

    for (const [eventName, type, attachment] of cases) {
      const [event] = normalizeZaloWebhook({ ...base, event_name: eventName, message: { msg_id: `z-${type}`, attachments: [attachment] } });
      expect(event).toMatchObject({ kind: "message.received", message: { type, attachments: [{ type }] } });
    }
  });

  it("returns no event for an unknown valid event", () => {
    expect(normalizeZaloWebhook({ event_name: "user_typing", oa_id: "oa", sender: { id: "u" }, timestamp: "1722500000000" })).toEqual([]);
  });
});

describe("Zalo provider outbound", () => {
  it("sends consultation text with an access_token header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: { message_id: "z.out" }, error: 0 }));
    const provider = createZaloProvider({ fetch: fetchMock });

    const result = await provider.sendText({
      externalAccountId: "oa-1",
      externalUserId: "uid-9",
      accessToken: "zalo-token-secret",
      text: "Chào anh/chị",
    });

    expect(result.providerMessageId).toBe("z.out");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openapi.zalo.me/v3.0/oa/message/cs");
    expect(new Headers(init.headers).get("access_token")).toBe("zalo-token-secret");
    expect(JSON.parse(String(init.body))).toEqual({ recipient: { user_id: "uid-9" }, message: { text: "Chào anh/chị" } });
  });

  it("routes JPEG and PDF uploads to their provider endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { attachment_id: "img-1" }, error: 0 }))
      .mockResolvedValueOnce(Response.json({ data: { token: "file-1" }, error: 0 }))
      .mockResolvedValueOnce(Response.json({ data: { message_id: "z.image" }, error: 0 }))
      .mockResolvedValueOnce(Response.json({ data: { message_id: "z.file" }, error: 0 }));
    const provider = createZaloProvider({ fetch: fetchMock });
    const common = { externalAccountId: "oa", externalUserId: "uid", accessToken: "token" };

    const image = await provider.uploadAttachment({ ...common, file: new Blob(["jpeg"], { type: "image/jpeg" }), fileName: "photo.jpg" });
    const file = await provider.uploadAttachment({ ...common, file: new Blob(["pdf"], { type: "application/pdf" }), fileName: "file.pdf" });
    await provider.sendAttachment({ ...common, ...image });
    await provider.sendAttachment({ ...common, ...file });

    expect(image).toEqual({ providerAttachmentId: "img-1", attachmentType: "IMAGE" });
    expect(file).toEqual({ providerAttachmentId: "file-1", attachmentType: "FILE" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://openapi.zalo.me/v2.0/oa/upload/image");
    expect(fetchMock.mock.calls[1][0]).toBe("https://openapi.zalo.me/v2.0/oa/upload/file");
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(FormData);
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toMatchObject({
      message: { attachment: { type: "image", payload: { attachment_id: "img-1" } } },
    });
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toMatchObject({
      message: { attachment: { type: "file", payload: { token: "file-1" } } },
    });
  });

  it("maps throttling to a sanitized retryable error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":-32,"message":"zalo-token-secret"}', { status: 429 }));
    const provider = createZaloProvider({ fetch: fetchMock });

    try {
      await provider.sendText({ externalAccountId: "oa", externalUserId: "u", accessToken: "zalo-token-secret", text: "x" });
      throw new Error("expected provider error");
    } catch (error) {
      expect(error).toBeInstanceOf(ChannelProviderError);
      const providerError = error as ChannelProviderError;
      expect(providerError.retryable).toBe(true);
      expect(providerError.publicMessage).not.toContain("zalo-token-secret");
    }
  });
});
