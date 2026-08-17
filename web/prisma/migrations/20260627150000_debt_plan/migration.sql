-- B3 (bổ sung) — Kế hoạch trả nợ (hẹn nợ): mỗi tháng ngày X trả Y đồng tới khi hết nợ.

CREATE TABLE "DebtPlan" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "monthlyAmount" DECIMAL(14,0) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DebtPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DebtPlan_caseId_key" ON "DebtPlan"("caseId");

ALTER TABLE "DebtPlan" ADD CONSTRAINT "DebtPlan_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DebtPlan" ADD CONSTRAINT "DebtPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
