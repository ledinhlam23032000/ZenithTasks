-- Giá vốn tồn kho (B5): bình quân gia quyền + đơn giá theo từng giao dịch kho.
-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "avgCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "unitCost" DECIMAL(12,2);
