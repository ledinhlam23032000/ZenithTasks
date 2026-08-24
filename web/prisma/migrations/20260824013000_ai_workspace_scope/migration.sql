CREATE TYPE "AssistantWorkspaceKind" AS ENUM ('INTERNAL', 'PROJECT');

ALTER TABLE "AssistantConversation"
  ADD COLUMN "workspaceKind" "AssistantWorkspaceKind" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "projectId" TEXT;

ALTER TABLE "AssistantApproval"
  ADD COLUMN "workspaceKind" "AssistantWorkspaceKind" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "projectId" TEXT;

CREATE INDEX "AssistantConversation_userId_workspaceKind_projectId_status_lastMessageAt_idx"
  ON "AssistantConversation"("userId", "workspaceKind", "projectId", "status", "lastMessageAt");
CREATE INDEX "AssistantApproval_projectId_status_idx"
  ON "AssistantApproval"("projectId", "status");
