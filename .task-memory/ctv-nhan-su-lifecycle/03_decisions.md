# Decisions — Vòng đời CTV và nhân viên

| Date | Decision | Reason | Impact |
|---|---|---|---|
| 2026-08-23 | Collaborator archive/suspend dùng trạng thái mềm, không delete row | Tài liệu, payout, khách và ca đều tham chiếu CTV; xóa row có thể làm FK thành null hoặc mất dữ liệu liên quan | `active=false` chặn portal/lookup; `archivedAt` và `suspendedAt` phân biệt lý do; restore chỉ do ADMIN |
| 2026-08-23 | Nhân viên và CTV dùng cùng `User.id` khi chuyển đổi | Tránh tạo tài khoản đôi, giữ login/audit/lịch sử | Role đổi qua server action có audit; profile Collaborator được upsert theo `userId` |
| 2026-08-23 | Nhân viên giới thiệu khách phải có Collaborator profile liên kết | Các bảng referral/payout đang khóa bằng `collaboratorId`, không nên khóa bằng tên | Tạo profile CTV bổ trợ nhưng không tự cấp quyền quản trị; ADMIN quyết định role/quyền |
| 2026-08-23 | Referral giữ nguyên `collaboratorAssignedAt` khi đã có, bản ghi mới dùng thời điểm tạo | Không kéo dài cửa sổ 6 tháng ngoài nghiệp vụ | Đổi trạng thái/role không tính lại tiền và không làm mới thời hạn khách đã giao |
| 2026-08-23 | Xóa cứng chỉ còn cho phép về mặt kỹ thuật ở migration/DB admin, không expose trong UI | Người dùng yêu cầu dữ liệu cũ không mất | UI dùng Lưu trữ/Khôi phục; audit mọi thao tác |
