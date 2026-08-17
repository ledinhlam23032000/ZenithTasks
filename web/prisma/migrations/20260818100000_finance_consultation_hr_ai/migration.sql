-- Finance, consultation, HR agreements and assistant memory
-- Safe additive migration: no reset, no destructive data changes.

CREATE TYPE "PaymentRequestType" AS ENUM ('EXPENSE', 'SALARY', 'COLLABORATOR', 'STAFF_OTHER');
CREATE TYPE "PaymentRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');
CREATE TYPE "StaffAgreementType" AS ENUM ('CONFIDENTIALITY', 'NON_COMPETE');
CREATE TYPE "StaffAgreementStatus" AS ENUM ('DRAFT', 'SIGNED', 'EXPIRED', 'REVOKED');
CREATE TYPE "AssistantFeedbackKind" AS ENUM ('CORRECTION', 'APPROVAL', 'REJECTION', 'NOTE');

CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "type" "PaymentRequestType" NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterId" TEXT NOT NULL,
    "approverId" TEXT,
    "payeeUserId" TEXT,
    "payeeName" TEXT NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "month" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsultationRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "weightKg" DECIMAL(5,2),
    "heightCm" DECIMAL(5,2),
    "bloodType" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "pulse" INTEGER,
    "bloodPressure" TEXT,
    "temperatureC" DECIMAL(4,1),
    "respiratoryRate" INTEGER,
    "spo2" INTEGER,
    "screening" JSONB,
    "patientConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "patientConfirmedAt" TIMESTAMP(3),
    "wants" TEXT,
    "currentCondition" TEXT,
    "expectedResult" TEXT,
    "doctorIndication" TEXT,
    "serviceSnapshot" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    CONSTRAINT "ConsultationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StaffAgreementType" NOT NULL,
    "status" "StaffAgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentSnapshot" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "fileName" TEXT,
    "fileUrl" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantFile" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractedText" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "AssistantFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AssistantFeedbackKind" NOT NULL,
    "prompt" TEXT NOT NULL,
    "originalAnswer" TEXT,
    "correctedAnswer" TEXT,
    "note" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssistantFeedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PayrollEntry" ADD COLUMN "commissionOverride" DECIMAL(14,0);
ALTER TABLE "PayrollEntry" ADD COLUMN "paymentRequestId" TEXT;
ALTER TABLE "CommissionPayout" ADD COLUMN "paymentRequestId" TEXT;
ALTER TABLE "CashTransaction" ADD COLUMN "paymentRequestId" TEXT;

CREATE UNIQUE INDEX "PaymentRequest_requestNo_key" ON "PaymentRequest"("requestNo");
CREATE UNIQUE INDEX "PayrollEntry_paymentRequestId_key" ON "PayrollEntry"("paymentRequestId");
CREATE UNIQUE INDEX "CommissionPayout_paymentRequestId_key" ON "CommissionPayout"("paymentRequestId");
CREATE UNIQUE INDEX "CashTransaction_paymentRequestId_key" ON "CashTransaction"("paymentRequestId");
CREATE UNIQUE INDEX "ConsultationRecord_caseId_key" ON "ConsultationRecord"("caseId");
CREATE UNIQUE INDEX "StaffAgreement_userId_type_version_key" ON "StaffAgreement"("userId", "type", "version");

CREATE INDEX "PaymentRequest_status_requestedAt_idx" ON "PaymentRequest"("status", "requestedAt");
CREATE INDEX "PaymentRequest_type_month_idx" ON "PaymentRequest"("type", "month");
CREATE INDEX "ConsultationRecord_createdAt_idx" ON "ConsultationRecord"("createdAt");
CREATE INDEX "StaffAgreement_userId_type_status_idx" ON "StaffAgreement"("userId", "type", "status");
CREATE INDEX "AssistantFile_uploadedById_createdAt_idx" ON "AssistantFile"("uploadedById", "createdAt");
CREATE INDEX "AssistantFeedback_kind_createdAt_idx" ON "AssistantFeedback"("kind", "createdAt");
CREATE INDEX "AssistantFeedback_userId_createdAt_idx" ON "AssistantFeedback"("userId", "createdAt");

ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsultationRecord" ADD CONSTRAINT "ConsultationRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultationRecord" ADD CONSTRAINT "ConsultationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffAgreement" ADD CONSTRAINT "StaffAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAgreement" ADD CONSTRAINT "StaffAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistantFile" ADD CONSTRAINT "AssistantFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
