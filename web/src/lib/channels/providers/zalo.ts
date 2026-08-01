import {
  ChannelProviderError,
  type ChannelProviderAdapter,
  type FetchLike,
  type NormalizedAttachment,
  type NormalizedChannelEvent,
  type ProviderProfile,
  type ProviderTokenSet,
  type SendResult,
} from "../types";

type ZaloProviderOptions = {
  fetch?: FetchLike;
  appId?: string;
  appSecret?: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function eventDate(value: unknown): Date | null {
  const milliseconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(milliseconds)) return null;
  const result = new Date(milliseconds);
  return Number.isNaN(result.getTime()) ? null : result;
}

function zaloAttachment(value: unknown): NormalizedAttachment | null {
  const item = record(value);
  const payload = record(item?.payload);
  const rawType = text(item?.type)?.toLowerCase();
  if (!item || !payload || !rawType) return null;
  const url = text(payload.url) ?? text(payload.thumbnail) ?? undefined;
  const providerAttachmentId = text(payload.id) ?? text(payload.attachment_id) ?? text(payload.token) ?? undefined;
  const name = text(payload.name) ?? text(payload.file_name) ?? undefined;

  if (rawType === "image") return { type: "IMAGE", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}) };
  if (rawType === "file" || rawType === "link") {
    return { type: "FILE", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}), ...(name ? { name } : {}) };
  }
  if (rawType === "sticker") return { type: "STICKER", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}) };
  return null;
}

export function normalizeZaloWebhook(payload: unknown): NormalizedChannelEvent[] {
  const root = record(payload);
  const eventName = text(root?.event_name);
  const accountId = text(root?.oa_id) ?? text(record(root?.recipient)?.id);
  const userId = text(record(root?.sender)?.id) ?? text(root?.user_id_by_app);
  const timestamp = eventDate(root?.timestamp);
  if (!root || !eventName || !accountId || !userId || !timestamp) return [];

  const base = {
    provider: "ZALO_OA" as const,
    externalAccountId: accountId,
    externalUserId: userId,
    externalThreadId: userId,
    timestamp,
  };
  const message = record(root.message);

  if (["user_send_text", "user_send_image", "user_send_file", "user_send_sticker"].includes(eventName)) {
    const providerMessageId = text(message?.msg_id);
    if (!message || !providerMessageId) return [];
    const attachments = array(message.attachments)
      .map(zaloAttachment)
      .filter((attachment): attachment is NormalizedAttachment => attachment !== null);
    const messageText = text(message.text);
    const eventType = eventName === "user_send_image"
      ? "IMAGE"
      : eventName === "user_send_file"
        ? "FILE"
        : eventName === "user_send_sticker"
          ? "STICKER"
          : attachments[0]?.type ?? (messageText ? "TEXT" : "UNSUPPORTED");
    return [{
      ...base,
      kind: "message.received",
      providerMessageId,
      message: { type: eventType, text: messageText, attachments },
    }];
  }

  if (["delivery", "oa_send_message_delivered"].includes(eventName)) {
    return [{ ...base, kind: "message.delivered", providerMessageId: text(message?.msg_id) }];
  }
  if (["user_seen_message", "oa_send_message_seen"].includes(eventName)) {
    return [{ ...base, kind: "message.read", providerMessageId: text(message?.msg_id) }];
  }
  if (["unfollow", "user_unfollow"].includes(eventName)) {
    return [{ ...base, kind: "contact.withdrawn" }];
  }
  return [];
}

async function json(response: Response): Promise<JsonRecord> {
  try {
    return record(await response.json()) ?? {};
  } catch {
    return {};
  }
}

function errorCode(body: JsonRecord): string | undefined {
  return typeof body.error === "number" || typeof body.error === "string" ? String(body.error) : undefined;
}

function hasZaloError(body: JsonRecord): boolean {
  const code = errorCode(body);
  return code !== undefined && code !== "0";
}

function zaloError(status: number, body: JsonRecord): ChannelProviderError {
  const code = errorCode(body);
  const reauthRequired = status === 401 || ["-124", "-216", "-201", "-14014"].includes(code ?? "");
  const retryable = status === 429 || status >= 500 || ["-32", "-2018"].includes(code ?? "");
  const publicMessage = reauthRequired
    ? "Kết nối Zalo OA đã hết hạn. Vui lòng kết nối lại."
    : retryable
      ? "Zalo OA đang bận. Vui lòng thử gửi lại sau."
      : "Zalo OA không chấp nhận yêu cầu này.";
  return new ChannelProviderError("ZALO_OA", publicMessage, { code, status, retryable, reauthRequired });
}

export function createZaloProvider(options: ZaloProviderOptions = {}): ChannelProviderAdapter {
  const fetcher = options.fetch ?? globalThis.fetch;
  const appId = options.appId ?? process.env.ZALO_APP_ID;
  const appSecret = options.appSecret ?? process.env.ZALO_APP_SECRET;

  async function request(url: string, init: RequestInit): Promise<JsonRecord> {
    let response: Response;
    try {
      response = await fetcher(url, init);
    } catch {
      throw new ChannelProviderError("ZALO_OA", "Không kết nối được Zalo OA. Vui lòng thử lại.", { retryable: true });
    }
    const body = await json(response);
    if (!response.ok || hasZaloError(body)) throw zaloError(response.status, body);
    return body;
  }

  async function tokenRequest(url: string, accessToken: string, init: RequestInit = {}): Promise<JsonRecord> {
    const headers = new Headers(init.headers);
    headers.set("access_token", accessToken);
    return request(url, { ...init, headers });
  }

  function tokenSet(body: JsonRecord): ProviderTokenSet {
    const accessToken = text(body.access_token);
    if (!accessToken) throw new ChannelProviderError("ZALO_OA", "Zalo OA không trả về access token.");
    return {
      accessToken,
      refreshToken: text(body.refresh_token) ?? undefined,
      expiresInSeconds: typeof body.expires_in === "number" ? body.expires_in : Number(body.expires_in) || undefined,
    };
  }

  function profile(body: JsonRecord): ProviderProfile {
    const data = record(body.data) ?? body;
    const id = text(data.oa_id) ?? text(data.user_id) ?? text(data.id);
    if (!id) throw new ChannelProviderError("ZALO_OA", "Zalo OA trả về hồ sơ không hợp lệ.");
    return {
      id,
      name: text(data.display_name) ?? text(data.name),
      avatarUrl: text(data.avatar) ?? text(data.avatar_url),
    };
  }

  return {
    provider: "ZALO_OA",
    buildAuthorizationUrl({ redirectUri, state, challenge }) {
      if (!appId) throw new ChannelProviderError("ZALO_OA", "Chưa cấu hình ZALO_APP_ID.");
      if (!challenge) throw new ChannelProviderError("ZALO_OA", "Thiếu PKCE challenge cho Zalo OA.");
      const url = new URL("https://oauth.zaloapp.com/v4/oa/permission");
      url.searchParams.set("app_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      return url.toString();
    },
    async exchangeAuthorizationCode({ code, redirectUri, verifier }): Promise<ProviderTokenSet> {
      if (!appId || !appSecret || !verifier) throw new ChannelProviderError("ZALO_OA", "Chưa cấu hình đầy đủ OAuth Zalo OA.");
      const form = new URLSearchParams({ app_id: appId, code, grant_type: "authorization_code", code_verifier: verifier, redirect_uri: redirectUri });
      const body = await request("https://oauth.zaloapp.com/v4/oa/access_token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", secret_key: appSecret },
        body: form,
      });
      return tokenSet(body);
    },
    async refreshAccessToken(refreshToken): Promise<ProviderTokenSet> {
      if (!appId || !appSecret) throw new ChannelProviderError("ZALO_OA", "Chưa cấu hình ứng dụng Zalo OA.");
      const form = new URLSearchParams({ app_id: appId, refresh_token: refreshToken, grant_type: "refresh_token" });
      return tokenSet(await request("https://oauth.zaloapp.com/v4/oa/access_token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", secret_key: appSecret },
        body: form,
      }));
    },
    normalizeWebhook: normalizeZaloWebhook,
    async sendText({ externalUserId, accessToken, text: content }): Promise<SendResult> {
      const body = await tokenRequest("https://openapi.zalo.me/v3.0/oa/message/cs", accessToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient: { user_id: externalUserId }, message: { text: content } }),
      });
      const providerMessageId = text(record(body.data)?.message_id) ?? text(body.message_id);
      if (!providerMessageId) throw new ChannelProviderError("ZALO_OA", "Zalo OA không trả về mã tin nhắn.");
      return { providerMessageId, timestamp: new Date() };
    },
    async uploadAttachment({ accessToken, file, fileName }) {
      const attachmentType = file.type.startsWith("image/") ? "IMAGE" as const : "FILE" as const;
      const endpoint = attachmentType === "IMAGE" ? "image" : "file";
      const form = new FormData();
      form.append("file", file, fileName);
      const body = await tokenRequest(`https://openapi.zalo.me/v2.0/oa/upload/${endpoint}`, accessToken, { method: "POST", body: form });
      const data = record(body.data);
      const providerAttachmentId = text(data?.attachment_id) ?? text(data?.token);
      if (!providerAttachmentId) throw new ChannelProviderError("ZALO_OA", "Zalo OA không trả về mã tệp.");
      return { providerAttachmentId, attachmentType };
    },
    async sendAttachment({ externalUserId, accessToken, attachmentType, providerAttachmentId }) {
      const payload = attachmentType === "IMAGE" ? { attachment_id: providerAttachmentId } : { token: providerAttachmentId };
      const body = await tokenRequest("https://openapi.zalo.me/v3.0/oa/message/cs", accessToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: { user_id: externalUserId },
          message: { attachment: { type: attachmentType.toLowerCase(), payload } },
        }),
      });
      const providerMessageId = text(record(body.data)?.message_id) ?? text(body.message_id);
      if (!providerMessageId) throw new ChannelProviderError("ZALO_OA", "Zalo OA không trả về mã tin nhắn.");
      return { providerMessageId, timestamp: new Date() };
    },
    async getAccountProfile(_externalAccountId, accessToken) {
      return profile(await tokenRequest("https://openapi.zalo.me/v3.0/oa/getoa", accessToken, { method: "GET" }));
    },
    async getContactProfile(_externalAccountId, externalUserId, accessToken) {
      const data = encodeURIComponent(JSON.stringify({ user_id: externalUserId }));
      return profile(await tokenRequest(`https://openapi.zalo.me/v3.0/oa/user/detail?data=${data}`, accessToken, { method: "GET" }));
    },
    async healthCheck(_externalAccountId, accessToken) {
      await tokenRequest("https://openapi.zalo.me/v3.0/oa/getoa", accessToken, { method: "GET" });
      return true;
    },
  };
}
