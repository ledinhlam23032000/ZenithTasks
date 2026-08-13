# Backup và khôi phục

Backup phải gồm PostgreSQL dump, `public/uploads`, volume `.runtime` và private inbox attachments. Dùng `windows/Sao-Luu.ps1` để tạo bản nén; cấu hình thêm một nơi offsite.

Trước migration:

1. Chạy backup và kiểm tra file có kích thước hợp lệ.
2. Khôi phục vào instance cô lập, không ghi đè production.
3. Kiểm tra login, khách, hồ sơ, ảnh, thanh toán, kho và báo cáo.
4. Ghi thời gian RPO/RTO và người xác nhận.

Không đưa backup hoặc khóa mã hóa vào Git. Mất `PHONE_ENC_KEY` đồng nghĩa không giải mã được số điện thoại đã lưu.
