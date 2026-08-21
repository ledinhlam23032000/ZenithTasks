# Quality gate — Phase 3: workspace, Nhân sự, alias navigation

- Date: 2026-08-21
- Branch: `feat/ux-execution-1-10`
- PR: #40
- Scope: Task 10, Task 22, Task 29.

## Đầu ra

Task 10 có `web/src/lib/case-workspace.ts` với preset admin, lâm sàng, lễ tân/thu tiền, tài chính và readonly. Trang hồ sơ dùng preset để chọn tab/default tab, hiển thị nhãn workspace, ẩn rail tài chính cho workspace lâm sàng/readonly và vẫn giữ `requireCap`, `canAccessCase`, `userCan` cùng server actions làm lớp bảo vệ.

Task 22 bổ sung profile workspace Nhân sự với bốn điểm vào Hồ sơ, Quyền, Vòng đời và Bảo mật. Màn hình tóm tắt trạng thái nghỉ việc, số quyền hiệu lực, 2FA, tài khoản và thông tin làm việc mà không thay đổi chính sách cấp quyền.

Task 29 mở rộng `quick-starts.ts` bằng alias nghiệp vụ như “Hồ sơ điều trị”, “Đề nghị thanh toán”, “Hộp thư”, “Lịch tái khám”; alias chỉ resolve khi route/module cha nằm trong effective navigation. AppShell có nhãn breadcrumb cho route ẩn theo parent module.

## Checks

- `pnpm exec tsc --noEmit`: PASS.
- `pnpm vitest run src/lib/case-workspace.test.ts src/lib/quick-starts.test.ts`: PASS, 6 tests.
- `pnpm test`: PASS, 56 test files / 346 tests.
- `pnpm build`: PASS; route optimization completed successfully.
- `git diff --check`: PASS.

## Fixes during gate

Regression cũ yêu cầu quick-start mặc định không hiện khi đang gõ và cho phép route tùy biến theo label nav. Vì vậy alias tìm kiếm được tách thành `getAliasItems`, còn `getQuickStartItems` giữ contract cũ. Route descendant hidden vẫn được resolve theo parent nav đã qua permission.
