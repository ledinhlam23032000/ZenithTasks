-- Additive only: project-local configuration proposals for AI/Admin preview governance.
-- No legacy clinic table is modified.

CREATE TYPE "ZWorkspaceProposalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'REJECTED', 'EXPIRED');

CREATE TABLE "ZWorkspaceConfigProposal" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "targetScope" TEXT NOT NULL DEFAULT 'PROJECT',
  "status" "ZWorkspaceProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "riskLevel" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "beforeConfig" JSONB,
  "afterConfig" JSONB NOT NULL,
  "rollbackVersionId" TEXT,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "appliedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZWorkspaceConfigProposal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ZWorkspaceConfigProposal" ADD CONSTRAINT "ZWorkspaceConfigProposal_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceConfigProposal" ADD CONSTRAINT "ZWorkspaceConfigProposal_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceConfigProposal" ADD CONSTRAINT "ZWorkspaceConfigProposal_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceConfigProposal" ADD CONSTRAINT "ZWorkspaceConfigProposal_appliedById_fkey"
  FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ZWorkspaceConfigProposal_projectId_status_createdAt_idx"
  ON "ZWorkspaceConfigProposal"("projectId", "status", "createdAt");
CREATE INDEX "ZWorkspaceConfigProposal_projectId_moduleKey_status_idx"
  ON "ZWorkspaceConfigProposal"("projectId", "moduleKey", "status");
