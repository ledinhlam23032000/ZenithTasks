# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Tách Nhân sự và Cộng tác viên, thêm định danh/đăng nhập CTV, đồng bộ thông tin hiển thị, nghỉ việc và thăng chức.
- Current phase: Phase 5 — kiểm thử và bàn giao review.
- Overall status: review

## Completed

Đã triển khai trên nhánh sandbox `agent/e01-ctv-nhan-su-portal`:

- Thêm `Role.COLLABORATOR`, module `/cong-tac-vien-cua-toi` và hard barrier RBAC; CTV vào đúng cổng sau login.
- Thêm `Collaborator.userId`, collaboratorId/assignment timestamp vào Customer/Lead/Appointment/CaseRecord, liên kết payout/payment request và StaffRoleHistory.
- Thêm migration additive `20260821150000_ctv_identity_staff_lifecycle` với backfill tên khớp duy nhất, không reset dữ liệu.
- Admin tạo CTV kèm username/mật khẩu; đổi hồ sơ CTV đồng bộ sourceDetail, case ownership, payout/payee display và audit; không đổi tiền.
- `/nhan-su` tách tab Đang làm/Đã nghỉ việc; retire khóa active ngay; restore có kiểm soát; update role/position/department ghi StaffRoleHistory và audit.
- `/khach-hang` và chi tiết khách kiểm tra server-side collaboratorId + cửa sổ 6 tháng; SĐT CTV chỉ dùng phoneLast5; CTV không có nút ghi.
- Tiếp nhận khách nguồn CTV yêu cầu hồ sơ CTV hợp lệ và gắn collaboratorId/assignment timestamp.

## Verified checks

- Baseline trước sửa: TypeScript đạt; 52 test files / 329 tests đạt.
- Sau sửa: Prisma generate đạt; TypeScript đạt; 53 test files / 332 tests đạt; Next production build đạt; `git diff --check` đạt.
- Regression mới: `collaborator-access.test.ts` và route-home CTV test đạt.

## Blockers / review required

Migration chưa chạy trên production vì chưa có backup/owner approval/DB URL. Cần review dữ liệu cũ có sourceDetail không khớp hoặc trùng tên CTV trước khi migrate thật. Cần xác nhận mốc 6 tháng dùng `Customer.createdAt` khi backfill. Cần QA bằng tài khoản CTV thật trên staging/QA để kiểm tra hồ sơ y khoa, ảnh, care messages và direct URL.

## Next actions

1. Review diff và migration SQL trên branch.
2. Backup QA/production, chạy `prisma migrate deploy` ở môi trường được duyệt.
3. Test login CTV, scope khách, mask phone, rename sync, retire/promotion; sau owner approval mới merge/deploy.

## Files to read first

- `.task-memory/ctv-nhan-su-portal/02_state.md`
- `.task-memory/ctv-nhan-su-portal/02_design.md`
- `web/prisma/migrations/20260821150000_ctv_identity_staff_lifecycle/migration.sql`
- `web/src/lib/collaborator-access.ts`
- `web/src/app/(app)/cong-tac-vien-cua-toi/page.tsx`
