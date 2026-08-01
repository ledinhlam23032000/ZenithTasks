import { createHash, randomUUID } from "node:crypto";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createOAuthAttemptValues, decryptChannelSecret, encryptChannelSecret } from "./crypto";
import { createMetaProvider } from "./providers/meta";
import { createZaloProvider } from "./providers/zalo";
import { ChannelProviderError } from "./types";
import type { ChannelProviderName } from "./types";

const OAUTH_ATTEMPT_TTL_MS = 10 * 60 * 1000;

export type OAuthAttemptRecord = {
  id: string;
  provider: ChannelProviderName;
  stateHash: string;
  verifierEnc: string | null;
  actorId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export interface OAuthAttemptStore {
  createAttempt(input: OAuthAttemptRecord): Promise<void>;
  findAttempt(stateHash: string): Promise<OAuthAttemptRecord | null>;
  markUsedIfUnused(id: string, usedAt: Date): Promise<boolean>;
}

export type BegunOAuthAttempt = {
  state: string;
  verifier: string;
  challenge: string;
  expiresAt: Date;
};

export type ConsumedOAuthAttempt = {
  id: string;
  provider: ChannelProviderName;
  actorId: string;
  verifier: string;
};

export async function beginOAuthAttempt(
  store: OAuthAttemptStore,
  provider: ChannelProviderName,
  actorId: string,
  now = new Date(),
): Promise<BegunOAuthAttempt> {
  const values = createOAuthAttemptValues();
  const expiresAt = new Date(now.getTime() + OAUTH_ATTEMPT_TTL_MS);
  await store.createAttempt({
    id: randomUUID(),
    provider,
    stateHash: values.stateHash,
    verifierEnc: values.verifierEnc,
    actorId,
    expiresAt,
    usedAt: null,
    createdAt: now,
  });
  return { state: values.state, verifier: values.verifier, challenge: values.challenge, expiresAt };
}

export async function consumeOAuthAttempt(
  store: OAuthAttemptStore,
  state: string,
  actorId: string,
  now = new Date(),
): Promise<ConsumedOAuthAttempt> {
  const stateHash = createHash("sha256").update(state).digest("hex");
  const attempt = await store.findAttempt(stateHash);
  if (!attempt) throw new Error("Liên kết không hợp lệ hoặc không còn tồn tại.");
  if (attempt.actorId !== actorId) throw new Error("Liên kết không thuộc tài khoản quản trị hiện tại.");
  if (attempt.usedAt) throw new Error("Liên kết đã được sử dụng.");
  if (attempt.expiresAt <= now) throw new Error("Liên kết đã hết hạn. Vui lòng bắt đầu lại.");
  if (!attempt.verifierEnc) throw new Error("Liên kết thiếu PKCE verifier.");
  if (!await store.markUsedIfUnused(attempt.id, now)) throw new Error("Liên kết đã được sử dụng.");
  return {
    id: attempt.id,
    provider: attempt.provider,
    actorId: attempt.actorId,
    verifier: decryptChannelSecret(attempt.verifierEnc),
  };
}

export class MemoryOAuthAttemptStore implements OAuthAttemptStore {
  readonly attempts: OAuthAttemptRecord[] = [];

  async createAttempt(input: OAuthAttemptRecord): Promise<void> {
    this.attempts.push({ ...input });
  }

  async findAttempt(stateHash: string): Promise<OAuthAttemptRecord | null> {
    return this.attempts.find((attempt) => attempt.stateHash === stateHash) ?? null;
  }

  async markUsedIfUnused(id: string, usedAt: Date): Promise<boolean> {
    const attempt = this.attempts.find((item) => item.id === id);
    if (!attempt || attempt.usedAt) return false;
    attempt.usedAt = usedAt;
    return true;
  }
}

export type MetaAccessiblePage = {
  id: string;
  name: string;
  accessToken: string;
  avatarUrl: string | null;
};

export function selectMetaPage(pages: MetaAccessiblePage[], expectedPageId: string): MetaAccessiblePage {
  const match = pages.find((page) => page.id === expectedPageId);
  if (match) return match;
  const accessible = pages.length > 0
    ? pages.map((page) => `${page.id} — ${page.name}`).join(", ")
    : "không có Page nào";
  throw new Error(`Không tìm thấy Fanpage ${expectedPageId}. Page tài khoản đang quản trị: ${accessible}.`);
}

const prismaOAuthAttemptStore: OAuthAttemptStore = {
  async createAttempt(input) {
    await prisma.oAuthAttempt.create({ data: input });
  },
  async findAttempt(stateHash) {
    return prisma.oAuthAttempt.findUnique({ where: { stateHash } });
  },
  async markUsedIfUnused(id, usedAt) {
    const result = await prisma.oAuthAttempt.updateMany({ where: { id, usedAt: null }, data: { usedAt } });
    return result.count === 1;
  },
};

function callbackUri(provider: ChannelProviderName, origin: string): string {
  const slug = provider === "ZALO_OA" ? "zalo" : "meta";
  return new URL(`/api/channels/${slug}/callback`, origin).toString();
}

export async function beginChannelOAuth(
  provider: ChannelProviderName,
  actorId: string,
  origin: string,
): Promise<URL> {
  const attempt = await beginOAuthAttempt(prismaOAuthAttemptStore, provider, actorId);
  const redirectUri = callbackUri(provider, origin);
  const adapter = provider === "ZALO_OA" ? createZaloProvider() : createMetaProvider();
  return new URL(adapter.buildAuthorizationUrl({ redirectUri, state: attempt.state, challenge: attempt.challenge }));
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function valueText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function metaPages(userAccessToken: string): Promise<MetaAccessiblePage[]> {
  const graphVersion = process.env.META_GRAPH_VERSION ?? "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,picture,access_token&limit=100`, {
    headers: { authorization: `Bearer ${userAccessToken}` },
  });
  let body: JsonRecord = {};
  try { body = record(await response.json()) ?? {}; } catch { /* sanitized below */ }
  if (!response.ok || body.error) {
    throw new ChannelProviderError("FACEBOOK_PAGE", "Không đọc được danh sách Fanpage đang quản trị.", { reauthRequired: response.status === 401 });
  }
  return (Array.isArray(body.data) ? body.data : []).flatMap((item): MetaAccessiblePage[] => {
    const page = record(item);
    const id = valueText(page?.id);
    const name = valueText(page?.name);
    const accessToken = valueText(page?.access_token);
    const pictureData = record(record(page?.picture)?.data);
    if (!id || !name || !accessToken) return [];
    return [{ id, name, accessToken, avatarUrl: valueText(pictureData?.url) }];
  });
}

async function subscribeMetaPage(pageId: string, pageAccessToken: string): Promise<void> {
  const graphVersion = process.env.META_GRAPH_VERSION ?? "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/subscribed_apps`, {
    method: "POST",
    headers: { authorization: `Bearer ${pageAccessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ subscribed_fields: ["messages", "messaging_postbacks", "message_deliveries", "message_reads"] }),
  });
  if (!response.ok) throw new ChannelProviderError("FACEBOOK_PAGE", "Không đăng ký được webhook cho Fanpage.", { reauthRequired: response.status === 401 });
}

export type ConnectedChannelAccount = {
  id: string;
  provider: ChannelProviderName;
  externalAccountId: string;
  displayName: string;
  status: "CONNECTED" | "DEGRADED" | "REAUTH_REQUIRED" | "DISCONNECTED";
};

export async function completeChannelOAuth(
  provider: ChannelProviderName,
  callbackUrl: string,
  actorId: string,
): Promise<ConnectedChannelAccount> {
  const callback = new URL(callbackUrl);
  const providerError = callback.searchParams.get("error_description") ?? callback.searchParams.get("error");
  if (providerError) throw new Error("Nhà cung cấp đã từ chối kết nối.");
  const code = callback.searchParams.get("code");
  const state = callback.searchParams.get("state");
  if (!code || !state) throw new Error("Callback OAuth thiếu code hoặc state.");
  const attempt = await consumeOAuthAttempt(prismaOAuthAttemptStore, state, actorId);
  if (attempt.provider !== provider) throw new Error("Nhà cung cấp OAuth không khớp với liên kết đã bắt đầu.");
  const redirectUri = `${callback.origin}${callback.pathname}`;

  let externalAccountId: string;
  let displayName: string;
  let avatarUrl: string | null;
  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresInSeconds: number | undefined;

  if (provider === "ZALO_OA") {
    const adapter = createZaloProvider();
    const tokens = await adapter.exchangeAuthorizationCode({ code, redirectUri, verifier: attempt.verifier });
    const profile = await adapter.getAccountProfile("", tokens.accessToken);
    externalAccountId = profile.id;
    displayName = profile.name ?? `Zalo OA ${profile.id}`;
    avatarUrl = profile.avatarUrl;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    expiresInSeconds = tokens.expiresInSeconds;
  } else {
    const adapter = createMetaProvider();
    const shortLived = await adapter.exchangeAuthorizationCode({ code, redirectUri });
    const longLived = await adapter.refreshAccessToken(shortLived.accessToken);
    const expectedPageId = process.env.META_PAGE_ID;
    if (!expectedPageId) throw new Error("Chưa cấu hình META_PAGE_ID.");
    const page = selectMetaPage(await metaPages(longLived.accessToken), expectedPageId);
    await subscribeMetaPage(page.id, page.accessToken);
    externalAccountId = page.id;
    displayName = page.name;
    avatarUrl = page.avatarUrl;
    accessToken = page.accessToken;
    expiresInSeconds = longLived.expiresInSeconds;
  }

  const tokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;
  const account = await prisma.channelAccount.upsert({
    where: { provider_externalAccountId: { provider, externalAccountId } },
    create: {
      provider,
      externalAccountId,
      displayName,
      avatarUrl,
      status: "CONNECTED",
      accessTokenEnc: encryptChannelSecret(accessToken),
      refreshTokenEnc: refreshToken ? encryptChannelSecret(refreshToken) : null,
      tokenExpiresAt,
      connectedById: actorId,
      connectedAt: new Date(),
      disconnectedAt: null,
      lastError: null,
    },
    update: {
      displayName,
      avatarUrl,
      status: "CONNECTED",
      accessTokenEnc: encryptChannelSecret(accessToken),
      refreshTokenEnc: refreshToken ? encryptChannelSecret(refreshToken) : null,
      tokenExpiresAt,
      connectedById: actorId,
      connectedAt: new Date(),
      disconnectedAt: null,
      lastError: null,
    },
    select: { id: true, provider: true, externalAccountId: true, displayName: true, status: true },
  });
  await audit(actorId, "CHANNEL_CONNECT", { entity: "ChannelAccount", entityId: account.id, meta: { provider, externalAccountId } });
  return account;
}
