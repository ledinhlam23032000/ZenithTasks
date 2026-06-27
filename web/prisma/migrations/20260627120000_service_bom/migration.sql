-- B5 giai đoạn 2 — Định mức vật tư theo dịch vụ (BOM).
-- Bảng ServiceMaterial: mỗi dòng = 1 dịch vụ tiêu hao mặc định `quantity` đơn vị 1 vật tư / lần.
-- Cờ CaseService.bomApplied: đánh dấu dòng dịch vụ đã trừ vật tư theo định mức (tránh trừ 2 lần).

CREATE TABLE "ServiceMaterial" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceMaterial_serviceId_materialId_key" ON "ServiceMaterial"("serviceId", "materialId");

CREATE INDEX "ServiceMaterial_serviceId_idx" ON "ServiceMaterial"("serviceId");

ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CaseService" ADD COLUMN "bomApplied" BOOLEAN NOT NULL DEFAULT false;
