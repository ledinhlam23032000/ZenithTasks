-- Bỏ hoa hồng theo % (chuyển sang nhập số tiền thủ công)
ALTER TABLE "User" DROP COLUMN "commissionRate";
ALTER TABLE "CaseRecord" DROP COLUMN "commissionRate";

-- Hoa hồng nhập tay theo tháng cho mỗi nhân sự (bảng lương)
ALTER TABLE "PayrollEntry" ADD COLUMN "commission" DECIMAL(14,0) NOT NULL DEFAULT 0;
