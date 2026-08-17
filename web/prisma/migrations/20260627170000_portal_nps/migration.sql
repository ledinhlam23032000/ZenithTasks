-- D3 giai đoạn 2 — hạn dùng link cổng khách + đánh giá NPS.

ALTER TABLE "Customer" ADD COLUMN "portalTokenExpiresAt" TIMESTAMP(3);

CREATE TABLE "NpsResponse" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NpsResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NpsResponse_customerId_idx" ON "NpsResponse"("customerId");
CREATE INDEX "NpsResponse_createdAt_idx" ON "NpsResponse"("createdAt");

ALTER TABLE "NpsResponse" ADD CONSTRAINT "NpsResponse_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
