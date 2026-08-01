import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature, verifyZaloSignature } from "../signatures";

describe("verifyMetaSignature", () => {
  it("accepts the exact raw body and rejects a one-byte mutation", () => {
    const raw = new TextEncoder().encode('{"object":"page"}');
    const signature = `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`;

    expect(verifyMetaSignature(raw, signature, "secret")).toBe(true);
    expect(verifyMetaSignature(new TextEncoder().encode('{"object":"Page"}'), signature, "secret")).toBe(false);
  });

  it("fails closed for missing or malformed signatures", () => {
    const raw = new TextEncoder().encode("{}");

    expect(verifyMetaSignature(raw, null, "secret")).toBe(false);
    expect(verifyMetaSignature(raw, "sha1=abc", "secret")).toBe(false);
    expect(verifyMetaSignature(raw, "sha256=not-hex", "secret")).toBe(false);
  });
});

describe("verifyZaloSignature", () => {
  it("accepts the documented digest and rejects a changed timestamp", () => {
    const appId = "zalo-app-id";
    const oaSecret = "oa-secret";
    const rawText = '{"event_name":"user_send_text","message":{"text":"Xin chao"}}';
    const timestamp = "1785552000000";
    const digest = createHash("sha256")
      .update(appId + rawText + timestamp + oaSecret)
      .digest("hex");

    expect(verifyZaloSignature(rawText, timestamp, `mac=${digest}`, appId, oaSecret)).toBe(true);
    expect(verifyZaloSignature(rawText, "1785552000001", `mac=${digest}`, appId, oaSecret)).toBe(false);
  });

  it("fails closed for missing or malformed signatures", () => {
    expect(verifyZaloSignature("{}", "1", null, "app", "secret")).toBe(false);
    expect(verifyZaloSignature("{}", "1", "sha256=abc", "app", "secret")).toBe(false);
    expect(verifyZaloSignature("{}", "1", "mac=not-hex", "app", "secret")).toBe(false);
  });
});
