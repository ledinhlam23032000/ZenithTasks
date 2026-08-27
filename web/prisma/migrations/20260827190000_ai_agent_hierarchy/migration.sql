-- Additive AI hierarchy migration.
-- CHILD agents must belong to one project; GLOBAL agents must have no project.
-- Partial unique indexes make the one-ACTIVE-agent invariant race-safe.

CREATE TYPE "ZAiAgentKind" AS ENUM ('CHILD', 'GLOBAL');

CREATE TYPE "ZAiAgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

ALTER TABLE "AssistantApproval"
  ADD COLUMN "agentId" TEXT;

ALTER TABLE "AssistantConversation"
  ADD COLUMN "agentId" TEXT;

CREATE TABLE "ZAiAgent" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "ZAiAgentKind" NOT NULL,
  "status" "ZAiAgentStatus" NOT NULL DEFAULT 'DRAFT',
  "projectId" TEXT,
  "createdById" TEXT,
  "model" TEXT,
  "systemPrompt" TEXT,
  "toolAllowlist" JSONB,
  "config" JSONB,
  "lastHeartbeatAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZAiAgent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZAiAgent_scope_check" CHECK (
    ("kind" = 'CHILD' AND "projectId" IS NOT NULL)
    OR ("kind" = 'GLOBAL' AND "projectId" IS NULL)
  )
);

CREATE UNIQUE INDEX "ZAiAgent_code_key" ON "ZAiAgent"("code");

CREATE INDEX "ZAiAgent_projectId_kind_status_idx"
  ON "ZAiAgent"("projectId", "kind", "status");

CREATE INDEX "ZAiAgent_status_lastHeartbeatAt_idx"
  ON "ZAiAgent"("status", "lastHeartbeatAt");

CREATE UNIQUE INDEX "ZAiAgent_active_child_project_uidx"
  ON "ZAiAgent"("projectId")
  WHERE "kind" = 'CHILD' AND "status" = 'ACTIVE';

CREATE UNIQUE INDEX "ZAiAgent_active_global_uidx"
  ON "ZAiAgent"("kind")
  WHERE "kind" = 'GLOBAL' AND "status" = 'ACTIVE';

ALTER TABLE "AssistantConversation"
  ADD CONSTRAINT "AssistantConversation_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "ZAiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistantApproval"
  ADD CONSTRAINT "AssistantApproval_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "ZAiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZAiAgent"
  ADD CONSTRAINT "ZAiAgent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZAiAgent"
  ADD CONSTRAINT "ZAiAgent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
