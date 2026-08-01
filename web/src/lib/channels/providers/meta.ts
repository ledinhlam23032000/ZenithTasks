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

type MetaProviderOptions = {
  fetch?: FetchLike;
  graphVersion?: string;
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

function dateFrom(value: unknown): Date | null {
  const milliseconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(milliseconds)) return null;
  const result = new Date(milliseconds);
  return Number.isNaN(result.getTime()) ? null : result;
}

function metaAttachment(value: unknown): NormalizedAttachment | null {
  const item = record(value);
  const payload = record(item?.payload);
  if (!item || !payload) return null;
  const rawType = text(item.type)?.toLowerCase();
  const url = text(payload.url) ?? undefined;
  const providerAttachmentId = text(payload.attachment_id) ?? text(payload.sticker_id) ?? undefined;

  if (payload.sticker_id || rawType === "sticker") {
    return { type: "STICKER", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}) };
  }
  if (rawType === "image") return { type: "IMAGE", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}) };
  if (rawType === "file" || rawType === "audio" || rawType === "video") {
    return { type: "FILE", ...(url ? { url } : {}), ...(providerAttachmentId ? { providerAttachmentId } : {}) };
  }
  return null;
}

export function normalizeMetaWebhook(payload: unknown): NormalizedChannelEvent[] {
  const root = record(payload);
  if (root?.object !== "page") return [];
  const normalized: NormalizedChannelEvent[] = [];

  for (const rawEntry of array(root.entry)) {
    const entry = record(rawEntry);
    const accountId = text(entry?.id);
    if (!entry || !accountId) continue;

    for (const rawItem of array(entry.messaging)) {
      const item = record(rawItem);
      const senderId = text(record(item?.sender)?.id);
      const recipientId = text(record(item?.recipient)?.id);
      const externalUserId = senderId === accountId ? recipientId : senderId;
      const timestamp = dateFrom(item?.timestamp);
      if (!item || !externalUserId || !timestamp) continue;

      const message = record(item.message);
      if (message && message.is_echo !== true) {
        const providerMessageId = text(message.mid);
        if (!providerMessageId) continue;
        const attachments = array(message.attachments)
          .map(metaAttachment)
          .filter((attachment): attachment is NormalizedAttachment => attachment !== null);
        const messageText = text(message.text);
        const type = attachments[0]?.type ?? (messageText ? "TEXT" : "UNSUPPORTED");
        normalized.push({
          kind: "message.received",
          provider: "FACEBOOK_PAGE",
          externalAccountId: accountId,
          externalUserId,
          externalThreadId: externalUserId,
          providerMessageId,
          timestamp,
          message: { type, text: messageText, attachments },
        });
        continue;
      }

      const delivery = record(item.delivery);
      if (delivery) {
        const deliveredAt = dateFrom(delivery.watermark) ?? timestamp;
        for (const mid of array(delivery.mids).map(text).filter((id): id is string => id !== null)) {
          normalized.push({
            kind: "message.delivered",
            provider: "FACEBOOK_PAGE",
            externalAccountId: accountId,
            externalUserId,
            externalThreadId: externalUserId,
            providerMessageId: mid,
            timestamp: deliveredAt,
          });
        }
        continue;
      }

      const read = record(item.read);
      if (read) {
        normalized.push({
          kind: "message.read",
          provider: "FACEBOOK_PAGE",
          externalAccountId: accountId,
          externalUserId,
          externalThreadId: externalUserId,
          providerMessageId: null,
          timestamp: dateFrom(read.watermark) ?? timestamp,
        });
      }
    }
  }
  return normalized;
}

async function json(response: Response): Promise<JsonRecord> {
  try {
    return record(await response.json()) ?? {};
  } catch {
    return {};
  }
}

function metaError(status: number, body: JsonRecord): ChannelProviderError {
  const detail = record(body.error);
  const code = text(detail?.code) ?? (typeof detail?.code === "number" ? String(detail.code) : undefined);
  const reauthRequired = status === 401 || code === "190";
  const retryable = status === 429 || status >= 500 || ["4", "17", "32", "613"].includes(code ?? "");
  const publicMessage = reauthRequired
    ? "Kết nối Facebook đã hết hạn. Vui lòng kết nối lại Fanpage."
    : retryable
      ? "Facebook đang bận. Vui lòng thử gửi lại sau."
      : "Facebook không chấp nhận yêu cầu này.";
  return new ChannelProviderError("FACEBOOK_PAGE", publicMessage, { code, status, retryable, reauthRequired });
}

export function createMetaProvider(options: MetaProviderOptions = {}): ChannelProviderAdapter {
  const fetcher = options.fetch ?? globalThis.fetch;
  const graphVersion = options.graphVersion ?? process.env.META_GRAPH_VERSION ?? "v23.0";
  const appId = options.appId ?? process.env.META_APP_ID;
  const appSecret = options.appSecret ?? process.env.META_APP_SECRET;
  const graph = `https://graph.facebook.com/${graphVersion}`;

  async function request(url: string, init: RequestInit): Promise<JsonRecord> {
    let response: Response;
    try {
      response = await fetcher(url, init);
    } catch {
      throw new ChannelProviderError("FACEBOOK_PAGE", "Không kết nối được Facebook. Vui lòng thử lại.", { retryable: true });
    }
    const body = await json(response);
    if (!response.ok || body.error) throw metaError(response.status, body);
    return body;
  }

  async function bearerRequest(url: string, accessToken: string, init: RequestInit = {}): Promise<JsonRecord> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${accessToken}`);
    return request(url, { ...init, headers });
  }

  function profile(body: JsonRecord): ProviderProfile {
    const id = text(body.id);
    if (!id) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook trả về hồ sơ không hợp lệ.");
    const picture = record(record(record(body.picture)?.data)?.data) ?? record(record(body.picture)?.data);
    return { id, name: text(body.name), avatarUrl: text(picture?.url) };
  }

  return {
    provider: "FACEBOOK_PAGE",
    buildAuthorizationUrl({ redirectUri, state }) {
      if (!appId) throw new ChannelProviderError("FACEBOOK_PAGE", "Chưa cấu hình META_APP_ID.");
      const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement");
      return url.toString();
    },
    async exchangeAuthorizationCode({ code, redirectUri }): Promise<ProviderTokenSet> {
      if (!appId || !appSecret) throw new ChannelProviderError("FACEBOOK_PAGE", "Chưa cấu hình ứng dụng Facebook.");
      const url = new URL(`${graph}/oauth/access_token`);
      url.searchParams.set("client_id", appId);
      url.searchParams.set("client_secret", appSecret);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("code", code);
      const body = await request(url.toString(), { method: "GET" });
      const accessToken = text(body.access_token);
      if (!accessToken) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook không trả về access token.");
      return { accessToken, expiresInSeconds: typeof body.expires_in === "number" ? body.expires_in : undefined };
    },
    async refreshAccessToken(refreshToken): Promise<ProviderTokenSet> {
      if (!appId || !appSecret) throw new ChannelProviderError("FACEBOOK_PAGE", "Chưa cấu hình ứng dụng Facebook.");
      const url = new URL(`${graph}/oauth/access_token`);
      url.searchParams.set("grant_type", "fb_exchange_token");
      url.searchParams.set("client_id", appId);
      url.searchParams.set("client_secret", appSecret);
      url.searchParams.set("fb_exchange_token", refreshToken);
      const body = await request(url.toString(), { method: "GET" });
      const accessToken = text(body.access_token);
      if (!accessToken) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook không trả về access token.");
      return { accessToken, expiresInSeconds: typeof body.expires_in === "number" ? body.expires_in : undefined };
    },
    normalizeWebhook: normalizeMetaWebhook,
    async sendText({ externalAccountId, externalUserId, accessToken, text: content }): Promise<SendResult> {
      const body = await bearerRequest(`${graph}/${encodeURIComponent(externalAccountId)}/messages`, accessToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient: { id: externalUserId }, messaging_type: "RESPONSE", message: { text: content } }),
      });
      const providerMessageId = text(body.message_id);
      if (!providerMessageId) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook không trả về mã tin nhắn.");
      return { providerMessageId, timestamp: new Date() };
    },
    async uploadAttachment({ externalAccountId, accessToken, file, fileName }) {
      const attachmentType = file.type.startsWith("image/") ? "IMAGE" as const : "FILE" as const;
      const form = new FormData();
      form.append("message", JSON.stringify({ attachment: { type: attachmentType.toLowerCase(), payload: { is_reusable: true } } }));
      form.append("filedata", file, fileName);
      const body = await bearerRequest(`${graph}/${encodeURIComponent(externalAccountId)}/message_attachments`, accessToken, { method: "POST", body: form });
      const providerAttachmentId = text(body.attachment_id);
      if (!providerAttachmentId) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook không trả về mã tệp.");
      return { providerAttachmentId, attachmentType };
    },
    async sendAttachment({ externalAccountId, externalUserId, accessToken, attachmentType, providerAttachmentId }) {
      const body = await bearerRequest(`${graph}/${encodeURIComponent(externalAccountId)}/messages`, accessToken, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: { id: externalUserId },
          messaging_type: "RESPONSE",
          message: { attachment: { type: attachmentType.toLowerCase(), payload: { attachment_id: providerAttachmentId } } },
        }),
      });
      const providerMessageId = text(body.message_id);
      if (!providerMessageId) throw new ChannelProviderError("FACEBOOK_PAGE", "Facebook không trả về mã tin nhắn.");
      return { providerMessageId, timestamp: new Date() };
    },
    async getAccountProfile(externalAccountId, accessToken) {
      return profile(await bearerRequest(`${graph}/${encodeURIComponent(externalAccountId)}?fields=id,name,picture`, accessToken, { method: "GET" }));
    },
    async getContactProfile(_externalAccountId, externalUserId, accessToken) {
      return profile(await bearerRequest(`${graph}/${encodeURIComponent(externalUserId)}?fields=id,name,picture`, accessToken, { method: "GET" }));
    },
    async healthCheck(externalAccountId, accessToken) {
      await bearerRequest(`${graph}/${encodeURIComponent(externalAccountId)}?fields=id`, accessToken, { method: "GET" });
      return true;
    },
  };
}
