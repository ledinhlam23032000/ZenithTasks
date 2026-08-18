ALTER TABLE "AssistantConversation"
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "memory" JSONB,
  ADD COLUMN "memoryVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastCompactedAt" TIMESTAMP(3);
