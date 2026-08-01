export type ChannelProviderName = "FACEBOOK_PAGE" | "ZALO_OA";
export type ChannelMessageType = "TEXT" | "IMAGE" | "FILE" | "STICKER" | "UNSUPPORTED";
export type UploadableAttachmentType = "IMAGE" | "FILE";

export type NormalizedAttachment = {
  type: Exclude<ChannelMessageType, "TEXT" | "UNSUPPORTED">;
  url?: string;
  providerAttachmentId?: string;
  name?: string;
  mimeType?: string;
};

type NormalizedEventBase = {
  provider: ChannelProviderName;
  externalAccountId: string;
  externalUserId: string;
  externalThreadId: string;
  timestamp: Date;
};

export type NormalizedChannelEvent =
  | (NormalizedEventBase & {
      kind: "message.received";
      providerMessageId: string;
      message: {
        type: ChannelMessageType;
        text: string | null;
        attachments: NormalizedAttachment[];
      };
    })
  | (NormalizedEventBase & {
      kind: "message.delivered" | "message.read";
      providerMessageId: string | null;
    })
  | (NormalizedEventBase & {
      kind: "contact.withdrawn";
    });

export class ChannelProviderError extends Error {
  constructor(
    public readonly provider: ChannelProviderName,
    public readonly publicMessage: string,
    options: {
      code?: string;
      retryable?: boolean;
      reauthRequired?: boolean;
      status?: number;
    } = {},
  ) {
    super(publicMessage);
    this.name = "ChannelProviderError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.reauthRequired = options.reauthRequired ?? false;
    this.status = options.status;
  }

  readonly code?: string;
  readonly retryable: boolean;
  readonly reauthRequired: boolean;
  readonly status?: number;
}

export type ProviderTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
};

export type ProviderProfile = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type SendTarget = {
  externalAccountId: string;
  externalUserId: string;
  accessToken: string;
};

export type SendResult = {
  providerMessageId: string;
  timestamp: Date;
};

export type UploadedAttachment = {
  providerAttachmentId: string;
  attachmentType: UploadableAttachmentType;
};

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ChannelProviderAdapter {
  readonly provider: ChannelProviderName;
  buildAuthorizationUrl(input: { redirectUri: string; state: string; challenge?: string }): string;
  exchangeAuthorizationCode(input: { code: string; redirectUri: string; verifier?: string }): Promise<ProviderTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<ProviderTokenSet>;
  normalizeWebhook(payload: unknown): NormalizedChannelEvent[];
  sendText(input: SendTarget & { text: string }): Promise<SendResult>;
  uploadAttachment(input: SendTarget & { file: Blob; fileName: string }): Promise<UploadedAttachment>;
  sendAttachment(input: SendTarget & UploadedAttachment): Promise<SendResult>;
  getAccountProfile(externalAccountId: string, accessToken: string): Promise<ProviderProfile>;
  getContactProfile(externalAccountId: string, externalUserId: string, accessToken: string): Promise<ProviderProfile>;
  healthCheck(externalAccountId: string, accessToken: string): Promise<boolean>;
}
