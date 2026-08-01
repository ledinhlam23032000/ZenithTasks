import { prisma } from "@/lib/db";
import { decryptChannelSecret, encryptChannelSecret } from "./crypto";
import { createMetaProvider } from "./providers/meta";
import { createZaloProvider } from "./providers/zalo";
import type { ChannelProviderName, ProviderTokenSet } from "./types";

const REFRESH_WINDOW_MS = 2 * 60 * 60 * 1000;

type TokenAccount = {
  id: string;
  provider: ChannelProviderName;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
};

export interface TokenStore {
  underLock<T>(accountId: string, operation: (account: TokenAccount) => Promise<T>): Promise<T>;
  save(accountId: string, tokens: ProviderTokenSet, now: Date): Promise<void>;
}

export type RefreshProvider = { refreshAccessToken(refreshToken: string): Promise<ProviderTokenSet> };

export async function refreshUnderLock(
  store: TokenStore,
  accountId: string,
  provider: RefreshProvider,
  now = new Date(),
): Promise<{ accessToken: string; refreshed: boolean }> {
  return store.underLock(accountId, async (account) => {
    const currentAccessToken = decryptChannelSecret(account.accessTokenEnc);
    if (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() > now.getTime() + REFRESH_WINDOW_MS) {
      return { accessToken: currentAccessToken, refreshed: false };
    }
    if (!account.refreshTokenEnc) throw new Error("Kết nối không có refresh token. Vui lòng kết nối lại.");
    const tokens = await provider.refreshAccessToken(decryptChannelSecret(account.refreshTokenEnc));
    await store.save(accountId, tokens, now);
    return { accessToken: tokens.accessToken, refreshed: true };
  });
}

export class MemoryTokenStore implements TokenStore {
  private account: TokenAccount;
  private queue: Promise<void> = Promise.resolve();

  private constructor(account: TokenAccount) { this.account = account; }

  static fromPlain(input: { id: string; provider: ChannelProviderName; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }): MemoryTokenStore {
    return new MemoryTokenStore({
      id: input.id,
      provider: input.provider,
      accessTokenEnc: encryptChannelSecret(input.accessToken),
      refreshTokenEnc: input.refreshToken ? encryptChannelSecret(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt,
    });
  }

  async underLock<T>(_accountId: string, operation: (account: TokenAccount) => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(this.account); } finally { release(); }
  }

  async save(_accountId: string, tokens: ProviderTokenSet, now: Date): Promise<void> {
    this.account.accessTokenEnc = encryptChannelSecret(tokens.accessToken);
    if (tokens.refreshToken) this.account.refreshTokenEnc = encryptChannelSecret(tokens.refreshToken);
    this.account.tokenExpiresAt = tokens.expiresInSeconds ? new Date(now.getTime() + tokens.expiresInSeconds * 1000) : null;
  }

  savedPlain() {
    return {
      accessToken: decryptChannelSecret(this.account.accessTokenEnc),
      refreshToken: this.account.refreshTokenEnc ? decryptChannelSecret(this.account.refreshTokenEnc) : null,
      tokenExpiresAt: this.account.tokenExpiresAt,
    };
  }
}

export async function withValidAccessToken<T>(accountId: string, operation: (accessToken: string) => Promise<T>): Promise<T> {
  const accessToken = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `channel:${accountId}`);
    const account = await tx.channelAccount.findUnique({ where: { id: accountId } });
    if (!account?.accessTokenEnc || account.status === "DISCONNECTED") throw new Error("Kênh chưa được kết nối.");
    if (!account.tokenExpiresAt || account.tokenExpiresAt.getTime() > Date.now() + REFRESH_WINDOW_MS) return decryptChannelSecret(account.accessTokenEnc);
    if (!account.refreshTokenEnc) {
      await tx.channelAccount.update({ where: { id: accountId }, data: { status: "REAUTH_REQUIRED", lastError: "Token sắp hết hạn và không có refresh token." } });
      throw new Error("Kết nối đã hết hạn. Vui lòng kết nối lại.");
    }
    const adapter = account.provider === "ZALO_OA" ? createZaloProvider() : createMetaProvider();
    const tokens = await adapter.refreshAccessToken(decryptChannelSecret(account.refreshTokenEnc));
    await tx.channelAccount.update({
      where: { id: accountId },
      data: {
        accessTokenEnc: encryptChannelSecret(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encryptChannelSecret(tokens.refreshToken) : account.refreshTokenEnc,
        tokenExpiresAt: tokens.expiresInSeconds ? new Date(Date.now() + tokens.expiresInSeconds * 1000) : null,
        status: "CONNECTED",
        lastError: null,
      },
    });
    return tokens.accessToken;
  });
  return operation(accessToken);
}
