ALTER TABLE "MaterialUsage"
ADD COLUMN "caseServiceId" TEXT;

CREATE INDEX "MaterialUsage_caseServiceId_idx" ON "MaterialUsage"("caseServiceId");

ALTER TABLE "MaterialUsage"
ADD CONSTRAINT "MaterialUsage_caseServiceId_fkey"
FOREIGN KEY ("caseServiceId") REFERENCES "CaseService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
