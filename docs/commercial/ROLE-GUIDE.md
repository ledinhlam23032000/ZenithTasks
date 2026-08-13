# Hướng dẫn theo vai trò

| Vai trò | Luồng chính | Dữ liệu nhạy cảm |
|---|---|---|
| ADMIN | Toàn hệ thống, cài đặt, audit | Toàn bộ, bắt buộc TOTP |
| MANAGER | Vận hành, báo cáo, tài chính | Theo capability, bắt buộc TOTP |
| DOCTOR | Ca được phân công, lâm sàng, ảnh | Không tự xem ca ngoài phạm vi |
| NURSE | Hỗ trợ chăm sóc/vật tư khi được cấp | Không mặc định xem full bệnh sử |
| CONSULTANT | Tư vấn và dịch vụ ca phụ trách | Không ghi bệnh sử đầy đủ |
| RECEPTION | Tiếp nhận, lịch, hành chính | SĐT chỉ 5 số cuối |
| TELESALE | Lead/lịch và liên hệ | Không xem dữ liệu lâm sàng |
| CARE | Chăm sóc, hội thoại được phân công | Không xem tài chính cá nhân |
| SHAREHOLDER | Dashboard/báo cáo aggregate | Không tên, SĐT, ảnh, bệnh sử, tin nhắn |
