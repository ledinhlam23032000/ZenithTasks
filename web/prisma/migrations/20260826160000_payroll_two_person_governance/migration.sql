-- Additive only: add separate approver/finalizer/void audit anchors to project-local payroll.
-- No legacy payroll/payment/case table is changed.

ALTER TABLE "ZWorkspacePayrollRun"
  ADD COLUMN "secondApprovedById" TEXT,
  ADD COLUMN "secondApprovedAt" TIMESTAMP(3),
  ADD COLUMN "finalizedById" TEXT,
  ADD COLUMN "voidedById" TEXT,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT;

ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_secondApprovedById_fkey"
  FOREIGN KEY ("secondApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_finalizedById_fkey"
  FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePayrollRun" ADD CONSTRAINT "ZWorkspacePayrollRun_voidedById_fkey"
  FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ZWorkspacePayrollRun_projectId_secondApprovedById_idx"
  ON "ZWorkspacePayrollRun"("projectId", "secondApprovedById");
