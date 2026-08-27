# Open Questions — cần owner quyết định

| ID | Câu hỏi | Mặc định an toàn tạm thời | Khi nào cần trả lời |
|---|---|---|---|
| Q-01 | Một user có thể thuộc nhiều company hay chỉ một company? | Cho phép nhiều membership, nhưng mỗi phiên chỉ có một active project context | Trước MC-03 |
| Q-02 | Company mới tạo có cần mời email hay Admin tạo username/mật khẩu trực tiếp? | Admin tạo/invite, bắt đổi mật khẩu lần đầu; không gửi secret qua log | Trước MC-03 |
| Q-03 | Vai trò trong company gồm những gì? | Owner/Admin, Manager, Staff; map vào capability hiện có, không tạo RBAC song song | Trước MC-03 |
| Q-04 | “Xóa dự án” có nghĩa hard-delete hay chỉ archive? | Archive/soft-delete + restore; hard-delete bị khóa mặc định | Trước MC-06 |
| Q-05 | AI con được làm gì? | Đọc/đề xuất trong scope; ghi chỉ qua preview → approval → audit | Trước MC-09 |
| Q-06 | AI Tổng có được xem raw dữ liệu từng company không? | Chỉ aggregate và health/audit summary; raw data cần chọn company + capability + purpose | Trước MC-10 |
| Q-07 | AI Tổng có được ra lệnh cho AI con thực hiện không? | Chỉ gửi task/proposal có target, trace, timeout và approval; không tự bypass child policy | Trước MC-11 |
| Q-08 | Mỗi company dùng model/chi phí AI riêng hay dùng chung? | Provider/model policy có thể riêng theo company; secret giữ ở server, không commit | Trước MC-09 |
| Q-09 | Payroll project-local có cần payout/accounting tích hợp ngay không? | Giữ unavailable cho tới khi có source of truth và owner approval | Trước MC-08 |
| Q-10 | Company có cần dữ liệu khách/hồ sơ y khoa hay chỉ quản lý nhân sự/doanh số? | Chỉ bật domain khi có policy, consent và isolation test tương ứng | Trước MC-07 |
| Q-11 | Có yêu cầu giới hạn số company, user, AI child hoặc retention log không? | Bounded pagination, audit retention theo policy hiện có | Trước MC-10/MC-15 |
| Q-12 | Ai sẽ duyệt migration và rollout trên máy clinic? | Owner/clinical owner duyệt; agent không tự vượt safety gate | Trước MC-14/MC-15 |
