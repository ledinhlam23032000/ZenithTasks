-- Khách tham khảo (Lead): khách từ nguồn giới thiệu tới tham khảo dịch vụ, chưa hẹn/chưa đến.

CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'LOST');

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneEnc" TEXT,
    "phoneLast5" TEXT,
    "phoneHash" TEXT,
    "source" "CustomerSource" NOT NULL DEFAULT 'OTHER',
    "sourceDetail" TEXT,
    "serviceInterest" TEXT,
    "note" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_phoneLast5_idx" ON "Lead"("phoneLast5");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
