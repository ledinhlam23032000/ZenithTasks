-- AlterTable
ALTER TABLE "CaseRecord" ADD COLUMN     "voucherAmount" DECIMAL(14,0) NOT NULL DEFAULT 0,
ADD COLUMN     "voucherCode" TEXT;

-- AlterTable
ALTER TABLE "CaseService" ADD COLUMN     "listPrice" DECIMAL(14,0) NOT NULL DEFAULT 0;

-- Backfill: hồ sơ cũ chưa có giá gốc → lấy giá ưu đãi làm giá gốc (tiết kiệm = 0)
UPDATE "CaseService" SET "listPrice" = "unitPrice";
