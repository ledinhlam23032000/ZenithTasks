-- CreateEnum
CREATE TYPE "ChannelProvider" AS ENUM ('ZALO_OA', 'FACEBOOK_PAGE');

-- CreateEnum
CREATE TYPE "ChannelAccountStatus" AS ENUM ('CONNECTED', 'DEGRADED', 'REAUTH_REQUIRED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'SNOOZED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InboxDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "InboxMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'STICKER', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "InboxMessageStatus" AS ENUM ('RECEIVED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationEventType" AS ENUM ('ASSIGNED', 'STATUS_CHANGED', 'INTERNAL_NOTE', 'CUSTOMER_LINKED', 'SEND_RETRIED');

-- CreateEnum
CREATE TYPE "WebhookReceiptStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "ChannelAccount" (
    "id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" "ChannelAccountStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "responseTargetMinutes" INTEGER,
    "connectedById" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastMaintenanceAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelContact" (
    "id" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "customerId" TEXT,
    "linkedById" TEXT,
    "linkedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "consentWithdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelThread" (
    "id" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "channelContactId" TEXT NOT NULL,
    "externalThreadId" TEXT NOT NULL,
    "lastMessagePreview" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "clientNonce" TEXT,
    "direction" "InboxDirection" NOT NULL,
    "type" "InboxMessageType" NOT NULL,
    "status" "InboxMessageStatus" NOT NULL,
    "content" TEXT,
    "replyToProviderMessageId" TEXT,
    "providerTimestamp" TIMESTAMP(3),
    "sentById" TEXT,
    "providerErrorCode" TEXT,
    "providerErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationEvent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" "ConversationEventType" NOT NULL,
    "actorId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationPresence" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isTyping" BOOLEAN NOT NULL DEFAULT false,
    "heartbeatAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "channelAccountId" TEXT,
    "eventKey" TEXT NOT NULL,
    "status" "WebhookReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "sanitizedPayload" JSONB,
    "payloadExpiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAttempt" (
    "id" TEXT NOT NULL,
    "provider" "ChannelProvider" NOT NULL,
    "stateHash" TEXT NOT NULL,
    "verifierEnc" TEXT,
    "actorId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxAttachment" (
    "id" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerAttachmentId" TEXT,
    "providerUrlEnc" TEXT,
    "originalName" TEXT,
    "storagePath" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelAccount_status_idx" ON "ChannelAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccount_provider_externalAccountId_key" ON "ChannelAccount"("provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "ChannelContact_customerId_idx" ON "ChannelContact"("customerId");

-- CreateIndex
CREATE INDEX "ChannelContact_lastSeenAt_idx" ON "ChannelContact"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelContact_channelAccountId_externalUserId_key" ON "ChannelContact"("channelAccountId", "externalUserId");

-- CreateIndex
CREATE INDEX "ChannelThread_channelContactId_idx" ON "ChannelThread"("channelContactId");

-- CreateIndex
CREATE INDEX "ChannelThread_lastMessageAt_idx" ON "ChannelThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelThread_channelAccountId_externalThreadId_key" ON "ChannelThread"("channelAccountId", "externalThreadId");

-- CreateIndex
CREATE INDEX "Conversation_status_assigneeId_idx" ON "Conversation"("status", "assigneeId");

-- CreateIndex
CREATE INDEX "Conversation_openedAt_idx" ON "Conversation"("openedAt");

-- Chỉ một chu kỳ xử lý OPEN/SNOOZED được tồn tại trên mỗi thread.
CREATE UNIQUE INDEX "Conversation_one_active_per_thread"
ON "Conversation"("threadId") WHERE "status" <> 'CLOSED';

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_clientNonce_key" ON "InboxMessage"("clientNonce");

-- CreateIndex
CREATE INDEX "InboxMessage_conversationId_createdAt_idx" ON "InboxMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxMessage_status_idx" ON "InboxMessage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_channelAccountId_providerMessageId_key" ON "InboxMessage"("channelAccountId", "providerMessageId");

-- CreateIndex
CREATE INDEX "ConversationEvent_conversationId_createdAt_idx" ON "ConversationEvent"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationPresence_heartbeatAt_idx" ON "ConversationPresence"("heartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPresence_conversationId_userId_key" ON "ConversationPresence"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "WebhookReceipt_payloadExpiresAt_idx" ON "WebhookReceipt"("payloadExpiresAt");

-- CreateIndex
CREATE INDEX "WebhookReceipt_status_receivedAt_idx" ON "WebhookReceipt"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookReceipt_provider_externalAccountId_eventKey_key" ON "WebhookReceipt"("provider", "externalAccountId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAttempt_stateHash_key" ON "OAuthAttempt"("stateHash");

-- CreateIndex
CREATE INDEX "OAuthAttempt_expiresAt_idx" ON "OAuthAttempt"("expiresAt");

-- CreateIndex
CREATE INDEX "InboxAttachment_status_createdAt_idx" ON "InboxAttachment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InboxAttachment_messageId_idx" ON "InboxAttachment"("messageId");

-- AddForeignKey
ALTER TABLE "ChannelAccount" ADD CONSTRAINT "ChannelAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelContact" ADD CONSTRAINT "ChannelContact_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelContact" ADD CONSTRAINT "ChannelContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelContact" ADD CONSTRAINT "ChannelContact_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelThread" ADD CONSTRAINT "ChannelThread_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelThread" ADD CONSTRAINT "ChannelThread_channelContactId_fkey" FOREIGN KEY ("channelContactId") REFERENCES "ChannelContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChannelThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEvent" ADD CONSTRAINT "ConversationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationPresence" ADD CONSTRAINT "ConversationPresence_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationPresence" ADD CONSTRAINT "ConversationPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookReceipt" ADD CONSTRAINT "WebhookReceipt_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAttempt" ADD CONSTRAINT "OAuthAttempt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
