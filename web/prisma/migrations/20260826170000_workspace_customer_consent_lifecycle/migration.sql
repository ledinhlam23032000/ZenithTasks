-- Additive only: customer consent and soft-delete lifecycle inside project-local workspace.
-- Does not alter legacy Customer or clinic consent tables.

ALTER TABLE "ZWorkspaceCustomer"
  ADD COLUMN "consentStatus" TEXT,
  ADD COLUMN "consentedAt" TIMESTAMP(3),
  ADD COLUMN "consentNote" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

ALTER TABLE "ZWorkspaceCustomer" ADD CONSTRAINT "ZWorkspaceCustomer_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ZWorkspaceCustomer_projectId_deletedAt_idx"
  ON "ZWorkspaceCustomer"("projectId", "deletedAt");
