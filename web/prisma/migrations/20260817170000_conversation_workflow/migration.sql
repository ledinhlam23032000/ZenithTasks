-- This migration may meet databases created by an earlier inbox branch where
-- ConversationStatus already existed as OPEN/SNOOZED/CLOSED. Reuse that type and
-- map the legacy labels to the current workflow labels instead of recreating it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'ConversationStatus'
  ) THEN
    CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');
  ELSE
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'ConversationStatus'
        AND e.enumlabel = 'SNOOZED'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'ConversationStatus'
        AND e.enumlabel = 'IN_PROGRESS'
    ) THEN
      ALTER TYPE "ConversationStatus" RENAME VALUE 'SNOOZED' TO 'IN_PROGRESS';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'ConversationStatus'
        AND e.enumlabel = 'CLOSED'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'ConversationStatus'
        AND e.enumlabel = 'DONE'
    ) THEN
      ALTER TYPE "ConversationStatus" RENAME VALUE 'CLOSED' TO 'DONE';
    END IF;
  END IF;
END
$$;

ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT,
  ADD COLUMN IF NOT EXISTS "slaDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastInboundAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Conversation_assignedToId_status_idx"
  ON "Conversation"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "Conversation_lastInboundAt_idx"
  ON "Conversation"("lastInboundAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'Conversation'
      AND c.conname = 'Conversation_assignedToId_fkey'
  ) THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
