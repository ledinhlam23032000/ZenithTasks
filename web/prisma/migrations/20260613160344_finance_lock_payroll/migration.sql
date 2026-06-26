-- AlterTable
ALTER TABLE "CaseRecord" ADD COLUMN     "commissionAmount" DECIMAL(14,0) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baseSalary" DECIMAL(14,0) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0;
