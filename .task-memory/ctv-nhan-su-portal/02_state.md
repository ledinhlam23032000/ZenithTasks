# Project State

- Updated: 2026-08-21 GMT+7
- Goal: Tách Nhân sự và Cộng tác viên, thêm định danh/đăng nhập CTV, đồng bộ thông tin hiển thị, nghỉ việc và thăng chức.
- Current phase: Release đã merge vào `master`; chờ triển khai có kiểm soát trên máy vận hành.
- Overall status: active

## Verified facts

PR #32 đã được squash merge vào `master`. Commit master hiện tại là `d31e564`. Nhánh feature từ xa đã được xóa sau merge. CI của PR đạt, TypeScript đạt, Vitest đạt 53 test files / 332 tests, Next production build đạt.

Đã cập nhật `VERSION.md` lên `2026.08.21-r11`, thêm release note vào `CHANGELOG.md` và cập nhật `web/BAN-GIAO.md` về role COLLABORATOR, schema ownership, cổng CTV và hard RBAC.

## Release contents

Bản vá gồm Role.COLLABORATOR, module `/cong-tac-vien-cua-toi`, liên kết CTV theo ID, đồng bộ thông tin hiển thị, cửa sổ 6 tháng, trạng thái nghỉ việc, lịch sử thăng chức và migration additive `20260821150000_ctv_identity_staff_lifecycle`.

## Open blockers / safety gate

Migration chưa chạy production. Trước khi vận hành phải backup database + uploads, kiểm tra các sourceDetail CTV cũ không khớp/trùng tên, chạy `prisma migrate deploy`, kiểm tra log backfill, rồi mới restart ứng dụng. Cần QA bằng tài khoản CTV thật: login, khách đúng phạm vi, khách hết 6 tháng bị ẩn, SĐT chỉ 5 số cuối, xem hồ sơ đầy đủ, đổi CTV đồng bộ, retire khóa quyền và promotion giữ userId. Không dùng `db push` hoặc reset.

## Next 3 actions

1. Đồng bộ master trên máy vận hành và tạo backup trước migration.
2. Chạy migration/restart theo `VERSION.md` và `web/DEPLOY.md` sau khi owner xác nhận tại thời điểm triển khai.
3. Ghi evidence production vào `checks/` và cập nhật checkpoint sau smoke test.

## Files to read first

- `VERSION.md`
- `CHANGELOG.md`
- `web/BAN-GIAO.md`
- `web/prisma/migrations/20260821150000_ctv_identity_staff_lifecycle/migration.sql`
- `.task-memory/ctv-nhan-su-portal/02_state.md`
