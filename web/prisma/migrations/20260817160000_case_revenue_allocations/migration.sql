CREATE TYPE "RevenueAllocationRole" AS ENUM ('CONSULTANT', 'DOCTOR', 'NURSE', 'OTHER');

CREATE TABLE "CaseRevenueAllocation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RevenueAllocationRole" NOT NULL,
    "shareBps" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseRevenueAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseRevenueAllocation_caseId_userId_role_key" ON "CaseRevenueAllocation"("caseId", "userId", "role");
CREATE INDEX "CaseRevenueAllocation_caseId_idx" ON "CaseRevenueAllocation"("caseId");
CREATE INDEX "CaseRevenueAllocation_userId_idx" ON "CaseRevenueAllocation"("userId");

ALTER TABLE "CaseRevenueAllocation" ADD CONSTRAINT "CaseRevenueAllocation_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseRevenueAllocation" ADD CONSTRAINT "CaseRevenueAllocation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseRevenueAllocation" ADD CONSTRAINT "CaseRevenueAllocation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
