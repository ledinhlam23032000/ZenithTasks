import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function safeHexMatch(expected: Buffer, candidate: string | undefined): boolean {
  if (!candidate || !/^[0-9a-f]{64}$/i.test(candidate)) return false;
  const supplied = Buffer.from(candidate, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function verifyMetaSignature(
  raw: Uint8Array,
  header: string | null | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !header) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;

  const expected = createHmac("sha256", appSecret).update(raw).digest();
  return safeHexMatch(expected, match[1]);
}

export function verifyZaloSignature(
  rawText: string,
  timestamp: string,
  header: string | null | undefined,
  appId: string,
  oaSecret: string,
): boolean {
  if (!rawText || !timestamp || !header || !appId || !oaSecret) return false;
  const match = /^mac=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;

  const expected = createHash("sha256")
    .update(appId + rawText + timestamp + oaSecret)
    .digest();
  return safeHexMatch(expected, match[1]);
}
