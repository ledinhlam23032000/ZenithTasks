# Execution plan — Vòng đời CTV và nhân viên

| Phase | Nội dung | Dependency | Acceptance |
|---|---|---|---|
| P1 | Audit schema, actions, UI, RBAC | Đã đọc checkpoint CTV và source liên quan | Xác định mọi hard delete và mọi luồng tạo/đổi role/referral |
| P2 | Trạng thái lưu trữ mềm và liên kết role | P1 | Suspend/archive/restore không xóa FK; audit; migration additive |
| P3 | UI quản trị và chuyển đổi | P2 | ADMIN có thể chuyển hai chiều, dùng cùng User ID, nhân viên giới thiệu được lưu như CTV |
| P4 | Regression + quality gate | P2–P3 | Prisma generate, tsc, test, build, diff check; kiểm tra RBAC và bất biến tiền |
| P5 | PR/CI/merge master | P4 | PR xanh, merge, fetch master, working tree sạch |
| P6 | Bàn giao | P5 | Cập nhật state/changelog, nêu migration và smoke test production |

## Quy tắc bất biến

- Không hard-delete User hoặc Collaborator có thể có lịch sử.
- `collaboratorId`, `commissionAmount`, amount, paidAt và snapshot tài chính không bị tính lại khi đổi trạng thái/role.
- Đổi role không tự cấp quyền quản trị; quyền hiệu lực vẫn do RBAC và ADMIN kiểm soát.
- Task 11 vẫn cancelled; không tự áp BOM vật tư.
