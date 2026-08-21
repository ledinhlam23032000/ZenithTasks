-- Additive migration: collaborator identity, six-month ownership window,
-- staff retirement state and promotion history. No reset or destructive data change.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COLLABORATOR';

CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'RETIRED');

ALTER TABLE "User"
  ADD COLUMN "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "retiredAt" TIMESTAMP(3),
  ADD COLUMN "retiredById" TEXT;

ALTER TABLE "Collaborator"
  ADD COLUMN "userId" TEXT;

ALTER TABLE "Customer"
  ADD COLUMN "collaboratorId" TEXT,
  ADD COLUMN "collaboratorAssignedAt" TIMESTAMP(3);

ALTER TABLE "Lead"
  ADD COLUMN "collaboratorId" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN "collaboratorId" TEXT;

ALTER TABLE "CaseRecord"
  ADD COLUMN "collaboratorId" TEXT,
  ADD COLUMN "collaboratorAssignedAt" TIMESTAMP(3);

ALTER TABLE "PaymentRequest"
  ADD COLUMN "payeeCollaboratorId" TEXT;

ALTER TABLE "CommissionPayout"
  ADD COLUMN "collaboratorId" TEXT;

CREATE TABLE "StaffRoleHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fromRole" "Role" NOT NULL,
  "toRole" "Role" NOT NULL,
  "fromPosition" TEXT,
  "toPosition" TEXT,
  "fromDepartment" TEXT,
  "toDepartment" TEXT,
  "note" TEXT,
  "changedById" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffRoleHistory_pkey" PRIMARY KEY ("id")
);

-- Backfill only unambiguous legacy name matches. Unmatched rows stay null for review.
UPDATE "Customer" c
SET "collaboratorId" = col."id",
    "collaboratorAssignedAt" = c."createdAt"
FROM "Collaborator" col
WHERE c."source" = 'COLLABORATOR'
  AND c."collaboratorId" IS NULL
  AND NULLIF(BTRIM(c."sourceDetail"), '') = col."name";

UPDATE "Lead" l
SET "collaboratorId" = col."id"
FROM "Collaborator" col
WHERE l."source" = 'COLLABORATOR'
  AND l."collaboratorId" IS NULL
  AND NULLIF(BTRIM(l."sourceDetail"), '') = col."name";

UPDATE "Appointment" a
SET "collaboratorId" = col."id"
FROM "Collaborator" col
WHERE a."source" = 'COLLABORATOR'
  AND a."collaboratorId" IS NULL
  AND NULLIF(BTRIM(a."sourceDetail"), '') = col."name";

UPDATE "CaseRecord" c
SET "collaboratorId" = cu."collaboratorId",
    "collaboratorAssignedAt" = COALESCE(cu."collaboratorAssignedAt", cu."createdAt")
FROM "Customer" cu
WHERE c."customerId" = cu."id"
  AND c."collaboratorId" IS NULL
  AND cu."collaboratorId" IS NOT NULL;

UPDATE "CommissionPayout" p
SET "collaboratorId" = col."id"
FROM "Collaborator" col
WHERE p."collaboratorId" IS NULL
  AND p."name" = col."name";

CREATE UNIQUE INDEX "Collaborator_userId_key" ON "Collaborator"("userId");
CREATE INDEX "Customer_collaboratorId_collaboratorAssignedAt_idx" ON "Customer"("collaboratorId", "collaboratorAssignedAt");
CREATE INDEX "Lead_collaboratorId_idx" ON "Lead"("collaboratorId");
CREATE INDEX "Appointment_collaboratorId_idx" ON "Appointment"("collaboratorId");
CREATE INDEX "CaseRecord_collaboratorId_collaboratorAssignedAt_idx" ON "CaseRecord"("collaboratorId", "collaboratorAssignedAt");
CREATE INDEX "PaymentRequest_payeeCollaboratorId_idx" ON "PaymentRequest"("payeeCollaboratorId");
CREATE UNIQUE INDEX "CommissionPayout_collaboratorId_month_key" ON "CommissionPayout"("collaboratorId", "month");
CREATE INDEX "CommissionPayout_collaboratorId_idx" ON "CommissionPayout"("collaboratorId");
CREATE INDEX "StaffRoleHistory_userId_changedAt_idx" ON "StaffRoleHistory"("userId", "changedAt");

ALTER TABLE "Collaborator"
  ADD CONSTRAINT "Collaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseRecord"
  ADD CONSTRAINT "CaseRecord_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRequest"
  ADD CONSTRAINT "PaymentRequest_payeeCollaboratorId_fkey"
  FOREIGN KEY ("payeeCollaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommissionPayout"
  ADD CONSTRAINT "CommissionPayout_collaboratorId_fkey"
  FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffRoleHistory"
  ADD CONSTRAINT "StaffRoleHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StaffRoleHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
