import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createMetaProvider } from "./providers/meta";
import { createZaloProvider } from "./providers/zalo";
import { withValidAccessToken } from "./token-manager";
import { downloadPendingInboxAttachments } from "./attachments";
import type { ChannelProviderName } from "./types";

type MaintenanceAccount = { id: string; provider: ChannelProviderName; status: "CONNECTED" | "DEGRADED" | "REAUTH_REQUIRED" | "DISCONNECTED" };
type MaintenanceReceipt = { id: string; payloadExpiresAt: Date | null; sanitizedPayload: object | null };

export interface MaintenanceStore {
  listAccounts(): Promise<MaintenanceAccount[]>;
  markHealthy(id: string, now: Date): Promise<void>;
  markDegraded(id: string, now: Date): Promise<void>;
  purgeExpiredPayloads(now: Date): Promise<number>;
}

export type MaintenanceServices = {
  refresh(accountId: string): Promise<boolean>;
  health(accountId: string, provider: ChannelProviderName): Promise<void>;
};

export type MaintenanceResult = { checked: number; refreshed: number; degraded: number; payloadsPurged: number };

export async function runMaintenanceWithStore(store: MaintenanceStore, now: Date, services: MaintenanceServices): Promise<MaintenanceResult> {
  const accounts = await store.listAccounts();
  let refreshed = 0;
  let degraded = 0;
  for (const account of accounts) {
    try {
      if (await services.refresh(account.id)) refreshed += 1;
      await services.health(account.id, account.provider);
      await store.markHealthy(account.id, now);
    } catch {
      degraded += 1;
      await store.markDegraded(account.id, now);
    }
  }
  return { checked: accounts.length, refreshed, degraded, payloadsPurged: await store.purgeExpiredPayloads(now) };
}

export class MemoryMaintenanceStore implements MaintenanceStore {
  constructor(public accounts: MaintenanceAccount[], public receipts: MaintenanceReceipt[]) {}
  async listAccounts() { return this.accounts.filter((item) => item.status !== "DISCONNECTED"); }
  async markHealthy(id: string) { const item = this.accounts.find((account) => account.id === id); if (item) item.status = "CONNECTED"; }
  async markDegraded(id: string) { const item = this.accounts.find((account) => account.id === id); if (item) item.status = "DEGRADED"; }
  async purgeExpiredPayloads(now: Date) {
    let count = 0;
    for (const receipt of this.receipts) if (receipt.sanitizedPayload && receipt.payloadExpiresAt && receipt.payloadExpiresAt <= now) { receipt.sanitizedPayload = null; count += 1; }
    return count;
  }
}

export async function runChannelMaintenance(now = new Date()): Promise<MaintenanceResult> {
  await downloadPendingInboxAttachments();
  const store: MaintenanceStore = {
    listAccounts: () => prisma.channelAccount.findMany({ where: { status: { not: "DISCONNECTED" } }, select: { id: true, provider: true, status: true } }),
    async markHealthy(id) { await prisma.channelAccount.update({ where: { id }, data: { status: "CONNECTED", lastHealthCheckAt: now, lastError: null } }); },
    async markDegraded(id) { await prisma.channelAccount.update({ where: { id }, data: { status: "DEGRADED", lastHealthCheckAt: now, lastError: "Kiểm tra kết nối thất bại." } }); },
    async purgeExpiredPayloads(at) {
      const result = await prisma.webhookReceipt.updateMany({ where: { sanitizedPayload: { not: Prisma.DbNull }, payloadExpiresAt: { lte: at } }, data: { sanitizedPayload: Prisma.DbNull, payloadExpiresAt: null } });
      await prisma.conversationPresence.deleteMany({ where: { heartbeatAt: { lt: new Date(at.getTime() - 24 * 60 * 60 * 1000) } } });
      return result.count;
    },
  };
  return runMaintenanceWithStore(store, now, {
    async refresh(accountId) {
      const before = await prisma.channelAccount.findUnique({ where: { id: accountId }, select: { tokenExpiresAt: true } });
      await withValidAccessToken(accountId, async () => undefined);
      return Boolean(before?.tokenExpiresAt && before.tokenExpiresAt.getTime() <= now.getTime() + 2 * 60 * 60 * 1000);
    },
    async health(accountId, provider) {
      const account = await prisma.channelAccount.findUniqueOrThrow({ where: { id: accountId }, select: { externalAccountId: true } });
      await withValidAccessToken(accountId, async (token) => {
        const adapter = provider === "ZALO_OA" ? createZaloProvider() : createMetaProvider();
        await adapter.healthCheck(account.externalAccountId, token);
      });
    },
  });
}
