-- B6 giai đoạn 2 — Phiếu đồng ý (consent) + mẫu phiếu.

CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseConsent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "relationship" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseConsent_caseId_idx" ON "CaseConsent"("caseId");

ALTER TABLE "CaseConsent" ADD CONSTRAINT "CaseConsent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseConsent" ADD CONSTRAINT "CaseConsent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ConsentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaseConsent" ADD CONSTRAINT "CaseConsent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
