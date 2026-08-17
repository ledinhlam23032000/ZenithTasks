-- Tích hợp kênh giao tiếp: Zalo OA + Facebook Messenger (hộp thư hợp nhất).
-- Xem lib/channels/ + BAN-GIAO.md mục "Kênh giao tiếp (Omnichannel)".

CREATE TYPE "ChannelKind" AS ENUM ('ZALO_OA', 'FACEBOOK');
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'SENT', 'FAILED');

-- 1) Kết nối kênh (1 Zalo OA hoặc 1 Facebook Page) — token lưu MÃ HOÁ.
CREATE TABLE IF NOT EXISTS "ChannelAccount" (
    "id" TEXT NOT NULL,
    "kind" "ChannelKind" NOT NULL,
    "label" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalName" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelAccount_kind_externalId_key" ON "ChannelAccount"("kind", "externalId");

ALTER TABLE "ChannelAccount" DROP CONSTRAINT IF EXISTS "ChannelAccount_connectedById_fkey";
ALTER TABLE "ChannelAccount" ADD CONSTRAINT "ChannelAccount_connectedById_fkey"
  FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) 1 luồng hội thoại với 1 người dùng bên ngoài (Zalo user / Facebook PSID).
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "kind" "ChannelKind" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "customerId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessagePreview" TEXT,
    "lastDirection" "CareDirection",
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_channelAccountId_externalUserId_key" ON "Conversation"("channelAccountId", "externalUserId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_customerId_idx" ON "Conversation"("customerId");

ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_channelAccountId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelAccountId_fkey"
  FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_customerId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Từng tin nhắn trong 1 hội thoại.
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "CareDirection" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "text" TEXT,
    "attachments" JSONB,
    "externalId" TEXT,
    "errorMessage" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_externalId_idx" ON "Message"("externalId");

ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_conversationId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_sentById_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_sentById_fkey"
  FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
