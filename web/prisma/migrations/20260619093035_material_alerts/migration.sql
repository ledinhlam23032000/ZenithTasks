-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "lotNo" TEXT,
ADD COLUMN     "minStock" DECIMAL(12,2) NOT NULL DEFAULT 0;
