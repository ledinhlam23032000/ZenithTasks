-- Tài liệu hồ sơ CTV và lịch sử các khoản hoa hồng đã chi.
-- Migration additive: backfill snapshot từ CommissionPayout, không tính lại tiền/hoa hồng hiện có.
CREATE TABLE "CollaboratorDocument" (
  "id" TEXT NOT NULL,
  "collaboratorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaboratorDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaboratorPayoutRecord" (
  "id" TEXT NOT NULL,
  "collaboratorId" TEXT NOT NULL,
  "amount" DECIMAL(14,0) NOT NULL,
  "month" TEXT NOT NULL,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidById" TEXT,
  "paymentRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaboratorPayoutRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollaboratorDocument_collaboratorId_createdAt_idx"
  ON "CollaboratorDocument"("collaboratorId", "createdAt");
CREATE INDEX "CollaboratorPayoutRecord_collaboratorId_paidAt_idx"
  ON "CollaboratorPayoutRecord"("collaboratorId", "paidAt");
CREATE INDEX "CollaboratorPayoutRecord_collaboratorId_month_idx"
  ON "CollaboratorPayoutRecord"("collaboratorId", "month");
CREATE UNIQUE INDEX "CollaboratorPayoutRecord_paymentRequestId_key"
  ON "CollaboratorPayoutRecord"("paymentRequestId");

-- Giữ lại lịch sử đã chi trong sổ kế toán cũ. Định danh và số tiền được sao chép,
-- không suy ra lại từ hồ sơ/ca. paymentRequestId giúp tránh ghi trùng khi hoàn tác.
INSERT INTO "CollaboratorPayoutRecord" (
  "id", "collaboratorId", "amount", "month", "note", "paidAt", "paidById", "paymentRequestId", "createdAt"
)
SELECT
  md5('collaborator-payout-record:' || p."id"),
  COALESCE(p."collaboratorId", col."id"),
  p."amount",
  p."month",
  'Đồng bộ từ sổ chi hoa hồng hiện hữu',
  p."paidAt",
  cash."createdById",
  p."paymentRequestId",
  p."paidAt"
FROM "CommissionPayout" p
JOIN "Collaborator" col
  ON col."id" = p."collaboratorId"
  OR (p."collaboratorId" IS NULL AND col."name" = p."name")
LEFT JOIN "CashTransaction" cash ON cash."id" = p."cashTxId";

ALTER TABLE "CollaboratorDocument"
  ADD CONSTRAINT "CollaboratorDocument_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollaboratorDocument_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaboratorPayoutRecord"
  ADD CONSTRAINT "CollaboratorPayoutRecord_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CollaboratorPayoutRecord_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CollaboratorPayoutRecord_paymentRequestId_fkey"
  FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
