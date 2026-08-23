CREATE TYPE "ZAgentProfileStatus" AS ENUM ('DRAFT', 'TESTING', 'PUBLISHED', 'RETIRED');
CREATE TYPE "ZTrainingExampleKind" AS ENUM ('KNOWLEDGE', 'CLARIFICATION', 'TOOL_CHOICE', 'WARNING', 'REFUSAL', 'POLICY');
CREATE TYPE "ZTrainingRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED');
CREATE TABLE "ZAgentProfile" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "status" "ZAgentProfileStatus" NOT NULL DEFAULT 'DRAFT', "model" TEXT, "systemPrompt" TEXT, "capabilities" JSONB, "policyConfig" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZAgentProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZTrainingDataset" (
  "id" TEXT NOT NULL, "agentId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "kind" "ZTrainingExampleKind" NOT NULL DEFAULT 'KNOWLEDGE', "version" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZTrainingDataset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZTrainingExample" (
  "id" TEXT NOT NULL, "datasetId" TEXT NOT NULL, "input" JSONB NOT NULL, "expected" JSONB NOT NULL, "tags" JSONB,
  "approved" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZTrainingExample_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZPromptVersion" (
  "id" TEXT NOT NULL, "agentId" TEXT NOT NULL, "version" INTEGER NOT NULL, "name" TEXT NOT NULL, "template" TEXT NOT NULL,
  "variables" JSONB, "status" "ZAgentProfileStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZPromptVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ZEvaluationRun" (
  "id" TEXT NOT NULL, "agentId" TEXT NOT NULL, "datasetId" TEXT, "status" "ZTrainingRunStatus" NOT NULL DEFAULT 'QUEUED',
  "score" DECIMAL(5,2), "metrics" JSONB, "report" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "ZEvaluationRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ZAgentProfile_code_key" ON "ZAgentProfile"("code");
CREATE UNIQUE INDEX "ZTrainingDataset_agentId_code_version_key" ON "ZTrainingDataset"("agentId", "code", "version");
CREATE INDEX "ZTrainingDataset_agentId_active_idx" ON "ZTrainingDataset"("agentId", "active");
CREATE INDEX "ZTrainingExample_datasetId_approved_idx" ON "ZTrainingExample"("datasetId", "approved");
CREATE UNIQUE INDEX "ZPromptVersion_agentId_version_key" ON "ZPromptVersion"("agentId", "version");
CREATE INDEX "ZEvaluationRun_agentId_status_idx" ON "ZEvaluationRun"("agentId", "status");
ALTER TABLE "ZTrainingDataset" ADD CONSTRAINT "ZTrainingDataset_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ZAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZTrainingExample" ADD CONSTRAINT "ZTrainingExample_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "ZTrainingDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZPromptVersion" ADD CONSTRAINT "ZPromptVersion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ZAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZEvaluationRun" ADD CONSTRAINT "ZEvaluationRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ZAgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
