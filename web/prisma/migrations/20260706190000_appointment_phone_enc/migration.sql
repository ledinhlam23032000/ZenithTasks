-- Thêm SĐT mã hoá (tuỳ chọn) cho lịch hẹn đặt qua cổng công khai (/dat-lich).
-- Trước đây số điện thoại đầy đủ bị nhét vào cột "note" dạng chữ thường — không
-- mã hoá, trái với quy ước bảo mật SĐT của toàn hệ thống (xem lib/phone.ts).
ALTER TABLE "Appointment" ADD COLUMN "phoneEnc" TEXT;
