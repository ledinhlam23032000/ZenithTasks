-- AI Tổng/AI con jobs are explicit, bounded, and auditable.
-- This migration is additive and must be reviewed/applied only on isolated QA first.

CREATE TYPE "ZAiJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED');
CREATE TYPE "ZAiJobDataAccess" AS ENUM ('METADATA_ONLY', 'SCOPED_PROJECT_DATA', 'APPROVED_RAW_TENANT_DATA');

CREATE TABLE "ZAiJob" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "sourceWorkspaceKind" "AssistantWorkspaceKind" NOT NULL,
  "sourceProjectId" TEXT,
  "conversationId" TEXT,
  "messageId" TEXT,
  "targetAgentId" TEXT NOT NULL,
  "targetProjectId" TEXT,
  "toolName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "arguments" JSONB NOT NULL,
  "dataAccess" "ZAiJobDataAccess" NOT NULL,
  "requiresRuntimeReauthorization" BOOLEAN NOT NULL DEFAULT true,
  "approvalId" TEXT,
  "resultMeta" JSONB,
  "failureMeta" JSONB,
  "status" "ZAiJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL,
  "timeoutMs" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZAiJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZAiJob_scope_check" CHECK (
    ("sourceWorkspaceKind" = 'PROJECT' AND "sourceProjectId" IS NOT NULL AND "targetProjectId" = "sourceProjectId")
    OR ("sourceWorkspaceKind" = 'GLOBAL')
  ),
  CONSTRAINT "ZAiJob_bounds_check" CHECK (
    "attempt" >= 0 AND "maxAttempts" BETWEEN 1 AND 3 AND "timeoutMs" BETWEEN 1000 AND 120000
  )
);

CREATE UNIQUE INDEX "ZAiJob_idempotencyKey_key" ON "ZAiJob"("idempotencyKey");
CREATE INDEX "ZAiJob_targetAgentId_status_createdAt_idx" ON "ZAiJob"("targetAgentId", "status", "createdAt");
CREATE INDEX "ZAiJob_targetProjectId_status_createdAt_idx" ON "ZAiJob"("targetProjectId", "status", "createdAt");
CREATE INDEX "ZAiJob_status_createdAt_idx" ON "ZAiJob"("status", "createdAt");

ALTER TABLE "ZAiJob"
  ADD CONSTRAINT "ZAiJob_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ZAiJob"
  ADD CONSTRAINT "ZAiJob_targetAgentId_fkey"
  FOREIGN KEY ("targetAgentId") REFERENCES "ZAiAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ZAiJob"
  ADD CONSTRAINT "ZAiJob_targetProjectId_fkey"
  FOREIGN KEY ("targetProjectId") REFERENCES "ZProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
