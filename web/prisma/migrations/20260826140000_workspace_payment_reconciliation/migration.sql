-- Additive only: project-local payment reconciliation.
-- Does not alter legacy clinic payment/finance tables.

CREATE TYPE "ZWorkspaceReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'EXCEPTION');

CREATE TABLE "ZWorkspacePaymentReconciliation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "saleId" TEXT,
    "ledgerEntryId" TEXT,
    "paymentRef" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "status" "ZWorkspaceReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedAt" TIMESTAMP(3),
    "matchedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspacePaymentReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZWorkspacePaymentReconciliation_projectId_paymentRef_key"
  ON "ZWorkspacePaymentReconciliation"("projectId", "paymentRef");
CREATE INDEX "ZWorkspacePaymentReconciliation_projectId_status_createdAt_idx"
  ON "ZWorkspacePaymentReconciliation"("projectId", "status", "createdAt");
CREATE INDEX "ZWorkspacePaymentReconciliation_projectId_saleId_idx"
  ON "ZWorkspacePaymentReconciliation"("projectId", "saleId");
CREATE INDEX "ZWorkspacePaymentReconciliation_projectId_ledgerEntryId_idx"
  ON "ZWorkspacePaymentReconciliation"("projectId", "ledgerEntryId");

ALTER TABLE "ZWorkspacePaymentReconciliation" ADD CONSTRAINT "ZWorkspacePaymentReconciliation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePaymentReconciliation" ADD CONSTRAINT "ZWorkspacePaymentReconciliation_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "ZWorkspaceSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePaymentReconciliation" ADD CONSTRAINT "ZWorkspacePaymentReconciliation_ledgerEntryId_fkey"
  FOREIGN KEY ("ledgerEntryId") REFERENCES "ZWorkspaceLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspacePaymentReconciliation" ADD CONSTRAINT "ZWorkspacePaymentReconciliation_matchedById_fkey"
  FOREIGN KEY ("matchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
