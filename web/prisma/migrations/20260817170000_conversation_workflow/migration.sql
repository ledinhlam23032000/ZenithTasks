CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

ALTER TABLE "Conversation"
  ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "lastInboundAt" TIMESTAMP(3);

CREATE INDEX "Conversation_assignedToId_status_idx" ON "Conversation"("assignedToId", "status");
CREATE INDEX "Conversation_lastInboundAt_idx" ON "Conversation"("lastInboundAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
