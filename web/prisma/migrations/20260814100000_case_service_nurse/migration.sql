-- Điều dưỡng phụ trách dòng dịch vụ (căn cứ tính "Tiền dịch vụ phụ" 100k/ca —
-- xem lib/commission.ts). Mirror đúng cấu trúc doctorId trên CaseService.
ALTER TABLE "CaseService" ADD COLUMN "nurseId" TEXT;

CREATE INDEX "CaseService_nurseId_idx" ON "CaseService"("nurseId");

ALTER TABLE "CaseService" ADD CONSTRAINT "CaseService_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
