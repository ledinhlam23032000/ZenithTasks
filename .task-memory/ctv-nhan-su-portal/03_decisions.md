# Decisions

| Date | Decision | Reason | Impact |
|---|---|---|---|
| 2026-08-21 | Thêm `Role.COLLABORATOR` nhưng không đưa vào `ALL` | CTV là workspace riêng, không được thừa hưởng quyền nhân sự | Chỉ có cổng CTV + đọc hồ sơ khách qua hard barrier |
| 2026-08-21 | Dùng `collaboratorId` thay cho tên làm khóa mới | Đổi tên phải đồng bộ mà không làm gãy lịch sử | Customer/Lead/Appointment/Case/Payout/PaymentRequest có FK nullable |
| 2026-08-21 | Mốc 6 tháng mặc định từ `collaboratorAssignedAt`, backfill bằng `Customer.createdAt` | Không phụ thuộc việc sửa hồ sơ sau này | CTV chỉ xem khách trong cửa sổ 6 tháng; payout cũ vẫn giữ |
| 2026-08-21 | Giữ `sourceDetail` và `payeeName` như snapshot hiển thị | Tương thích dữ liệu và bảo toàn chứng từ | Rename transaction cập nhật text hiển thị, không chạm tiền |
| 2026-08-21 | Nghỉ việc = `employmentStatus=RETIRED` + `active=false` | Phân biệt nghỉ việc với khóa tạm | Không đăng nhập/không đọc dữ liệu nhưng giữ userId và lịch sử |
| 2026-08-21 | Thăng chức trên cùng User ID + `StaffRoleHistory` | Không xóa/tạo tài khoản mới | Lịch sử quyền và dữ liệu cũ không bị mất |
