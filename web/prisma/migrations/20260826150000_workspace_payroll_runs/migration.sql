-- Additive only: project-local payroll and commission snapshots.
-- Does not alter legacy Attendance, PayrollEntry, CollaboratorPayoutRecord, or clinic payroll tables.

CREATE TYPE "ZWorkspacePayrollRunStatus" AS ENUM ('DRAFT', 'PREVIEW', 'APPROVED', 'FINALIZED', 'VOIDED');
CREATE TYPE "ZWorkspacePayrollLineStatus" AS ENUM ('CALCULATED', 'APPROVED', 'PAID', 'VOIDED');

CREATE TABLE "ZWorkspacePayrollRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mechanismVersionId" TEXT,
    "code" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "status" "ZWorkspacePayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "mechanismSnapshot" JSONB,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspacePayrollRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZWorkspacePayrollLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ZWorkspacePayrollLineStatus" NOT NULL DEFAULT 'CALCULATED',
    "grossAmount" DECIMAL(14,0) NOT NULL,
    "commissionAmount" DECIMAL(14,0) NOT NULL,
    "deductionAmount" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,0) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspacePayrollLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZWorkspacePayrollRun_projectId_code_key" ON "ZWorkspacePayrollRun"("projectId", "code");
CREATE INDEX "ZWorkspacePayrollRun_projectId_status_periodStart_periodEnd_idx" ON "ZWorkspacePayrollRun"("projectId", "status", "periodStart", "periodEnd");
CREATE INDEX "ZWorkspacePayrollRun_projectId_mechanismVersionId_idx" ON "ZWorkspacePayrollRun"("projectId", "mechanismVersionId");
CREATE UNIQUE INDEX "ZWorkspacePayrollLine_runId_userId_key" ON "ZWorkspacePayrollLine"("runId", "userId");
CREATE INDEX "ZWorkspacePayrollLine_projectId_status_idx" ON "ZWorkspacePayrollLine"("projectId", "status");
CREATE INDEX "ZWorkspacePayrollLine_projectId_userId_idx" ON "ZWorkspacePayrollLine"("projectId", "userId");

ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_mechanismVersionId_fkey"
  FOREIGN KEY ("mechanismVersionId") REFERENCES "ZMechanismVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZWorkspacePayrollLine" ADD CONSTRAINT "ZWorkspacePayrollLine_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "ZWorkspacePayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollLine" ADD CONSTRAINT "ZWorkspacePayrollLine_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollLine" ADD CONSTRAINT "ZWorkspacePayrollLine_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
