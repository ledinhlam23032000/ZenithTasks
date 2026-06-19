-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "listPrice" DECIMAL(14,0) NOT NULL DEFAULT 0;

-- Backfill: dịch vụ cũ chưa có giá niêm yết → lấy bằng giá ưu đãi (tránh hiển thị "tiết kiệm" ảo).
UPDATE "Service" SET "listPrice" = "defaultPrice" WHERE "listPrice" = 0;
