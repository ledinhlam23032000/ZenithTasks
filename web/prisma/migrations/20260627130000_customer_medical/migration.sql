-- B6 giai đoạn 1 — Thông tin an toàn y khoa của khách (dị ứng / tiền sử / chống chỉ định).
-- Bác sĩ xem cảnh báo trước khi làm dịch vụ. Đều là text tuỳ chọn (nhập tay khi tiếp nhận).

ALTER TABLE "Customer" ADD COLUMN "allergies" TEXT;
ALTER TABLE "Customer" ADD COLUMN "medicalHistory" TEXT;
ALTER TABLE "Customer" ADD COLUMN "contraindications" TEXT;
