CREATE TYPE "AssistantConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');
CREATE TYPE "AssistantMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" "AssistantConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AssistantMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssistantApproval" ADD COLUMN "conversationId" TEXT;

CREATE INDEX "AssistantConversation_userId_status_lastMessageAt_idx"
  ON "AssistantConversation"("userId", "status", "lastMessageAt");
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx"
  ON "AssistantMessage"("conversationId", "createdAt");
CREATE INDEX "AssistantMessage_userId_createdAt_idx"
  ON "AssistantMessage"("userId", "createdAt");
CREATE INDEX "AssistantApproval_conversationId_idx"
  ON "AssistantApproval"("conversationId");

ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantApproval" ADD CONSTRAINT "AssistantApproval_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "AssistantApproval" SET "conversationId" = NULL WHERE "conversationId" IS NULL;
