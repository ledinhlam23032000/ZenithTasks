import { describe, expect, it, vi } from "vitest";
import { MemoryMaintenanceStore, runMaintenanceWithStore } from "../maintenance";
import { handleMaintenanceRequest } from "../maintenance-handler";

describe("channel maintenance", () => {
  it("purges seven-day payloads and isolates a degraded provider", async () => {
    const now = new Date("2026-08-08T08:00:00Z");
    const store = new MemoryMaintenanceStore([
      { id: "ok", provider: "FACEBOOK_PAGE", status: "CONNECTED" },
      { id: "bad", provider: "ZALO_OA", status: "CONNECTED" },
    ], [
      { id: "old", payloadExpiresAt: new Date("2026-08-08T07:59:59Z"), sanitizedPayload: { kind: "x" } },
      { id: "new", payloadExpiresAt: new Date("2026-08-09T00:00:00Z"), sanitizedPayload: { kind: "y" } },
    ]);
    const health = vi.fn(async (id: string) => { if (id === "bad") throw new Error("provider down"); });

    const result = await runMaintenanceWithStore(store, now, { refresh: vi.fn().mockResolvedValue(false), health });

    expect(result).toMatchObject({ checked: 2, degraded: 1, payloadsPurged: 1 });
    expect(store.receipts.find((item) => item.id === "old")?.sanitizedPayload).toBeNull();
    expect(store.accounts.find((item) => item.id === "ok")?.status).toBe("CONNECTED");
    expect(store.accounts.find((item) => item.id === "bad")?.status).toBe("DEGRADED");
  });
});

describe("maintenance route authorization", () => {
  it("returns 401, 401 and counts-only 200", async () => {
    const run = vi.fn().mockResolvedValue({ checked: 2, refreshed: 1, degraded: 0, payloadsPurged: 3 });
    const request = (authorization?: string) => new Request("https://zenith.test/api/internal/channels/maintenance", { method: "POST", headers: authorization ? { authorization } : {} });

    expect((await handleMaintenanceRequest(request(), { secret: "cron-secret", run })).status).toBe(401);
    expect((await handleMaintenanceRequest(request("Bearer wrong"), { secret: "cron-secret", run })).status).toBe(401);
    const response = await handleMaintenanceRequest(request("Bearer cron-secret"), { secret: "cron-secret", run });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, refreshed: 1, degraded: 0, payloadsPurged: 3 });
  });
});
