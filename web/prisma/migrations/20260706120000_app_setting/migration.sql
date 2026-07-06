-- Cấu hình khoá–giá trị dùng chung (ngưỡng cảnh báo công nợ, và cấu hình khác sau này).
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
