import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryTokenStore, refreshUnderLock } from "../token-manager";

const KEY = Buffer.alloc(32, 7).toString("base64");
let old: string | undefined;
beforeEach(() => { old = process.env.CHANNEL_TOKEN_ENC_KEY; process.env.CHANNEL_TOKEN_ENC_KEY = KEY; });
afterEach(() => { if (old === undefined) delete process.env.CHANNEL_TOKEN_ENC_KEY; else process.env.CHANNEL_TOKEN_ENC_KEY = old; });

describe("refreshUnderLock", () => {
  it("persists a new one-time Zalo refresh token atomically", async () => {
    const store = MemoryTokenStore.fromPlain({ id: "a1", provider: "ZALO_OA", accessToken: "access-old", refreshToken: "refresh-old", tokenExpiresAt: new Date("2026-08-01T09:00:00Z") });
    const provider = { refreshAccessToken: vi.fn().mockResolvedValue({ accessToken: "access-new", refreshToken: "refresh-new", expiresInSeconds: 90000 }) };

    const result = await refreshUnderLock(store, "a1", provider, new Date("2026-08-01T08:00:00Z"));

    expect(result.accessToken).toBe("access-new");
    expect(store.savedPlain()).toMatchObject({ accessToken: "access-new", refreshToken: "refresh-new" });
  });

  it("refreshes once when two workers arrive concurrently", async () => {
    const store = MemoryTokenStore.fromPlain({ id: "a1", provider: "ZALO_OA", accessToken: "old", refreshToken: "refresh", tokenExpiresAt: new Date("2026-08-01T09:00:00Z") });
    const provider = { refreshAccessToken: vi.fn().mockResolvedValue({ accessToken: "new", refreshToken: "refresh-new", expiresInSeconds: 90000 }) };

    const results = await Promise.all([
      refreshUnderLock(store, "a1", provider, new Date("2026-08-01T08:00:00Z")),
      refreshUnderLock(store, "a1", provider, new Date("2026-08-01T08:00:00Z")),
    ]);

    expect(provider.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(results.map((item) => item.accessToken)).toEqual(["new", "new"]);
  });
});
