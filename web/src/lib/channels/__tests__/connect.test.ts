import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MemoryOAuthAttemptStore,
  beginOAuthAttempt,
  consumeOAuthAttempt,
  selectMetaPage,
} from "../connect";

const TEST_KEY = Buffer.from(Array.from({ length: 32 }, (_, index) => index + 1)).toString("base64");
let previousKey: string | undefined;

beforeEach(() => {
  previousKey = process.env.CHANNEL_TOKEN_ENC_KEY;
  process.env.CHANNEL_TOKEN_ENC_KEY = TEST_KEY;
});

afterEach(() => {
  if (previousKey === undefined) delete process.env.CHANNEL_TOKEN_ENC_KEY;
  else process.env.CHANNEL_TOKEN_ENC_KEY = previousKey;
});

describe("OAuth attempt", () => {
  it("consumes state exactly once", async () => {
    const store = new MemoryOAuthAttemptStore();
    const now = new Date("2026-08-01T08:00:00.000Z");
    const attempt = await beginOAuthAttempt(store, "ZALO_OA", "admin-1", now);

    await expect(consumeOAuthAttempt(store, attempt.state, "admin-1", now)).resolves.toMatchObject({ provider: "ZALO_OA", actorId: "admin-1" });
    await expect(consumeOAuthAttempt(store, attempt.state, "admin-1", now)).rejects.toThrow("đã được sử dụng");
    expect(store.attempts[0].stateHash).not.toBe(attempt.state);
    expect(store.attempts[0].verifierEnc).not.toContain(attempt.verifier);
  });

  it("rejects expiry at ten minutes and a different actor", async () => {
    const store = new MemoryOAuthAttemptStore();
    const now = new Date("2026-08-01T08:00:00.000Z");
    const expired = await beginOAuthAttempt(store, "FACEBOOK_PAGE", "admin-1", now);

    await expect(consumeOAuthAttempt(store, expired.state, "admin-1", new Date("2026-08-01T08:10:00.000Z"))).rejects.toThrow("hết hạn");
    const actorMismatch = await beginOAuthAttempt(store, "FACEBOOK_PAGE", "admin-1", now);
    await expect(consumeOAuthAttempt(store, actorMismatch.state, "admin-2", now)).rejects.toThrow("không thuộc tài khoản");
  });
});

describe("Meta Page selection", () => {
  const pages = [
    { id: "page-1", name: "Trang Một", accessToken: "page-token-one", avatarUrl: null },
    { id: "page-2", name: "Trang Hai", accessToken: "page-token-two", avatarUrl: "https://cdn/avatar.jpg" },
  ];

  it("selects only the exact configured Page", () => {
    expect(selectMetaPage(pages, "page-2")).toEqual(pages[1]);
  });

  it("reports only accessible names and IDs when no Page matches", () => {
    try {
      selectMetaPage(pages, "page-missing");
      throw new Error("expected selection error");
    } catch (error) {
      const publicMessage = error instanceof Error ? error.message : String(error);
      expect(publicMessage).toContain("page-1 — Trang Một");
      expect(publicMessage).toContain("page-2 — Trang Hai");
      expect(publicMessage).not.toContain("page-token");
    }
  });
});
