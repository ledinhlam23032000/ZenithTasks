# Changelog ZenithTasks

Tài liệu này ghi các thay đổi đã được đẩy lên nhánh `master`. Commit mới hơn nằm ở phía trên. Phiên bản mô tả đầy đủ hiện tại nằm trong [`VERSION.md`](VERSION.md).

## 2026-08-17 — `2026.08.17-r2`

### Tài chính, lương và doanh thu

- Sửa lỗi doanh thu bị đếm đôi khi một nhân sự vừa là tư vấn viên vừa là bác sĩ của cùng hồ sơ.
- Thêm engine phân bổ doanh thu theo hồ sơ tại `web/src/lib/revenue-attribution.ts`.
- Thêm tab `Phối hợp DS` để ADMIN chia doanh thu giữa nhiều nhân sự theo tỷ lệ; tổng tỷ lệ phải đủ 100%.
- Đồng bộ DS phân bổ giữa bảng lương và hiệu suất nhân sự.
- Thêm cảnh báo tài chính cho snapshot lệch, trả vượt, thanh toán không có dịch vụ, giảm giá/voucher bất thường và thanh toán không hợp lệ.
- QR VietQR cho phép nhân viên nhập số tiền bất kỳ trước khi tạo mã.

### AI quản trị

- Thêm tool AI đọc công nợ, bảng lương, xuất file và tổng quan vận hành.
- Thêm xếp hạng khách nên ưu tiên gọi lại.
- Thêm đọc cảnh báo tài chính.
- Thêm luồng tạo follow-up, ghi nhận thanh toán và tạo lịch hẹn.
- Mọi thao tác ghi có bản xem trước, kiểm quyền và xác nhận ADMIN.
- Thêm fallback JSON khi provider AI không hỗ trợ `response_format` dạng JSON Schema.

### Hộp thư và vận hành

- Thêm phân công hội thoại cho nhân viên.
- Thêm trạng thái `OPEN`, `IN_PROGRESS`, `DONE`.
- Tin đến tự mở lại hội thoại và tính SLA theo Facebook/Zalo.
- Thêm mẫu trả lời nhanh trong hộp thư.
- Thêm Timeline khách hàng 360° gồm hồ sơ, lịch hẹn, follow-up, chăm sóc và hội thoại.
- Dashboard có tin chưa đọc và cảnh báo tài chính.

### Kiểm tra

- 44 file test, 296/296 test đạt.
- TypeScript đạt.
- Next.js production build đạt.
- Git working tree sạch tại thời điểm cập nhật.

### Commit liên quan

| Commit | Nội dung |
|---|---|
| [`e9071af`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e9071af) | Revenue attribution core |
| [`d79816c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/d79816c) | QR nhập số tiền |
| [`4162672`](https://github.com/ledinhlam23032000/ZenithTasks/commit/4162672) | Dashboard tin chưa đọc |
| [`30861c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/30861c6) | Phân công và SLA hộp thư |
| [`827f5ee`](https://github.com/ledinhlam23032000/ZenithTasks/commit/827f5ee) | Cảnh báo tài chính |
| [`f5bad30`](https://github.com/ledinhlam23032000/ZenithTasks/commit/f5bad30) | AI ưu tiên khách và cảnh báo |
| [`585e5c6`](https://github.com/ledinhlam23032000/ZenithTasks/commit/585e5c6) | AI tạo lịch hẹn |
| [`87fb972`](https://github.com/ledinhlam23032000/ZenithTasks/commit/87fb972) | Timeline khách hàng 360° |
| [`5c67b0c`](https://github.com/ledinhlam23032000/ZenithTasks/commit/5c67b0c) | Mẫu trả lời nhanh |
| [`e993fc5`](https://github.com/ledinhlam23032000/ZenithTasks/commit/e993fc5) | Công bố VERSION, CHANGELOG và cập nhật tài liệu bàn giao |

## Quy tắc ghi changelog cho các phiên sau

Mỗi thay đổi nghiệp vụ phải ghi ngày, mục đích, tệp hoặc migration chính, ảnh hưởng dữ liệu, test đã chạy và việc chủ dự án cần làm. Không ghi “đã xong” nếu mới chỉ sửa giao diện mà chưa kiểm tra luồng server, quyền và dữ liệu.
