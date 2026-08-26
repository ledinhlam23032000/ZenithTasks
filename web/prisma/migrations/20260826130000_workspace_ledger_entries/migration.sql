-- Additive only: project-local ledger foundation.
-- Does not alter legacy clinic finance, thu-chi, payment, or payroll tables.

CREATE TYPE "ZWorkspaceLedgerDirection" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "ZWorkspaceLedgerStatus" AS ENUM ('POSTED', 'VOIDED');

CREATE TABLE "ZWorkspaceLedgerEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "saleId" TEXT,
    "code" TEXT NOT NULL,
    "direction" "ZWorkspaceLedgerDirection" NOT NULL,
    "status" "ZWorkspaceLedgerStatus" NOT NULL DEFAULT 'POSTED',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,0) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceRef" TEXT,
    "createdById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZWorkspaceLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZWorkspaceLedgerEntry_projectId_code_key"
  ON "ZWorkspaceLedgerEntry"("projectId", "code");
CREATE INDEX "ZWorkspaceLedgerEntry_projectId_direction_status_occurredAt_idx"
  ON "ZWorkspaceLedgerEntry"("projectId", "direction", "status", "occurredAt");
CREATE INDEX "ZWorkspaceLedgerEntry_projectId_saleId_idx"
  ON "ZWorkspaceLedgerEntry"("projectId", "saleId");

ALTER TABLE "ZWorkspaceLedgerEntry" ADD CONSTRAINT "ZWorkspaceLedgerEntry_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ZProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceLedgerEntry" ADD CONSTRAINT "ZWorkspaceLedgerEntry_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "ZWorkspaceSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZWorkspaceLedgerEntry" ADD CONSTRAINT "ZWorkspaceLedgerEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
