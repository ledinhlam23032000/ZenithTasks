# Changelog — UX audit

## 2026-08-21

Đã khởi tạo audit tĩnh trên master sau release r11. Đã lập product map cho navigation/RBAC/search, walkthrough các vai trò lễ tân/telesale, clinical, CSKH, kế toán, admin và CTV, đồng thời ghi nhận các pattern tốt của `Việc cần làm hôm nay` và `Đầu ca`.

Đã xác minh các điểm friction chính: menu nhiều lớp và route hidden; global search chỉ tìm 4 entity với TAKE=6; Reception Flow tách giữa tiếp nhận và lịch hẹn; conflict override phải submit lần hai; hồ sơ điều trị dồn nhiều nghiệp vụ; BOM có bước thủ công; inbox tách gắn khách/phân công/SLA; PaymentRequest dùng modal và reload; permission editor mang tính kỹ thuật; CTV portal thiếu next action/ngày hết phạm vi.

Đã tạo báo cáo chính `AUDIT_UX_VAN_HANH_2026-08.md` và backlog `03_prioritized_backlog.md`, không sửa code và không chạy thao tác ghi dữ liệu.
