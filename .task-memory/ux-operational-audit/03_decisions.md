# Decisions — UX audit

| Ngày | Quyết định | Lý do | Tác động |
|---|---|---|---|
| 2026-08-21 | Ưu tiên giảm bước và giảm chuyển ngữ cảnh hơn thêm tính năng | Người dùng đã phản ánh ứng dụng khó thao tác; mã nguồn cho thấy nghiệp vụ đã khá đầy đủ | Backlog tập trung vào Customer 360, Reception Flow, queue và state machine |
| 2026-08-21 | Dùng `Việc cần làm hôm nay` và `Đầu ca` làm pattern chuẩn | Đây là hai khu vực có trạng thái + count + action inline | Các module khác nên tiến gần mô hình một hàng — một trạng thái — một hành động tiếp theo |
| 2026-08-21 | P0 dành cho y tế, tiền, quyền và tìm kiếm cốt lõi | Sai các vùng này gây hậu quả lớn hơn vấn đề UI | Checklist khóa hồ sơ, search entity và workspace theo vai trò nằm trước quick polish |
| 2026-08-21 | Không tạo skill mới trong task này | `/skill-creator` chỉ cần áp dụng nếu thực sự tạo/sửa skill; audit sản phẩm chưa phải skill | Giữ deliverable là báo cáo/backlog; nếu cần tái sử dụng audit sẽ mở task skill riêng |
| 2026-08-21 | Không tự kết luận tần suất khi chưa có telemetry | Audit hiện dựa trên mã nguồn, không có log thao tác hoặc shadowing người dùng | Ghi rõ các mục cần kiểm chứng và đề xuất đo sau triển khai |
