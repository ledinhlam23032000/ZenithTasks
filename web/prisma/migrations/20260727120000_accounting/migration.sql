-- Kế toán: chốt sổ tháng + theo dõi đã chi lương / hoa hồng cộng tác viên.

-- 1) Bảng lương: đánh dấu đã chi (gắn với giao dịch trong sổ thu chi)
ALTER TABLE "PayrollEntry" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,0) NOT NULL DEFAULT 0;
ALTER TABLE "PayrollEntry" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "PayrollEntry" ADD COLUMN IF NOT EXISTS "cashTxId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollEntry_cashTxId_key" ON "PayrollEntry"("cashTxId");

ALTER TABLE "PayrollEntry" DROP CONSTRAINT IF EXISTS "PayrollEntry_cashTxId_fkey";
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_cashTxId_fkey"
  FOREIGN KEY ("cashTxId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) Kỳ kế toán đã chốt sổ
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
  "id" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "serviceRevenue" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "otherIncome" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "operatingExpense" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "salaryExpense" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "ctvCommission" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "profit" DECIMAL(14,0) NOT NULL DEFAULT 0,
  "note" TEXT,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedById" TEXT,
  CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountingPeriod_month_key" ON "AccountingPeriod"("month");
CREATE INDEX IF NOT EXISTS "AccountingPeriod_month_idx" ON "AccountingPeriod"("month");

ALTER TABLE "AccountingPeriod" DROP CONSTRAINT IF EXISTS "AccountingPeriod_closedById_fkey";
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Chi hoa hồng cộng tác viên theo tháng
CREATE TABLE IF NOT EXISTS "CommissionPayout" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "amount" DECIMAL(14,0) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cashTxId" TEXT,
  CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionPayout_name_month_key" ON "CommissionPayout"("name", "month");
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionPayout_cashTxId_key" ON "CommissionPayout"("cashTxId");
CREATE INDEX IF NOT EXISTS "CommissionPayout_month_idx" ON "CommissionPayout"("month");

ALTER TABLE "CommissionPayout" DROP CONSTRAINT IF EXISTS "CommissionPayout_cashTxId_fkey";
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_cashTxId_fkey"
  FOREIGN KEY ("cashTxId") REFERENCES "CashTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
