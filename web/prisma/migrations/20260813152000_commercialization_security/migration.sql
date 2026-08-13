ALTER TABLE "Customer" ADD COLUMN "portalTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "archivedById" TEXT;
ALTER TABLE "Customer" ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "Appointment" ADD COLUMN "phoneEnc" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "phoneHash" TEXT;

ALTER TABLE "StockMovement" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "reversalOfId" TEXT;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseRecord" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "CaseRecord" ADD COLUMN "archivedById" TEXT;
ALTER TABLE "CaseRecord" ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "voidedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "voidReason" TEXT;
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

ALTER TABLE "MaterialUsage" ADD COLUMN "caseServiceId" TEXT;
ALTER TABLE "MaterialUsage" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "MaterialUsage" ADD CONSTRAINT "MaterialUsage_caseServiceId_fkey"
  FOREIGN KEY ("caseServiceId") REFERENCES "CaseService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseService" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "CaseService" ADD COLUMN "cancelledById" TEXT;
ALTER TABLE "CaseService" ADD COLUMN "cancelReason" TEXT;

CREATE INDEX "Appointment_phoneHash_idx" ON "Appointment"("phoneHash");
CREATE INDEX "StockMovement_sourceType_sourceId_idx" ON "StockMovement"("sourceType", "sourceId");
CREATE INDEX "StockMovement_reversalOfId_idx" ON "StockMovement"("reversalOfId");

CREATE TABLE "ServiceMaterial" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceMaterial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceMaterial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceMaterial_serviceId_materialId_key" ON "ServiceMaterial"("serviceId", "materialId");
CREATE INDEX "ServiceMaterial_materialId_idx" ON "ServiceMaterial"("materialId");

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
