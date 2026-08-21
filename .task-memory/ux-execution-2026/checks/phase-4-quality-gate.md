# Quality gate — Phase 4: hồ sơ, quyền, Nhân sự, CTV, mobile, dashboard

- Date: 2026-08-21
- Branch: `feat/ux-execution-1-10`
- PR: #40
- Scope: Task 12, 23–30 và Task 33.

## Đầu ra

Task 12 thêm readiness badges trong hồ sơ: tư vấn thiếu xác nhận, dịch vụ thiếu, nhắc tự rà vật tư, giấy tờ, công nợ và tái khám. Badge vật tư là cảnh báo không blocking; hệ thống không tự động áp BOM.

Task 23 thêm preset quyền theo chức danh và preview số quyền mở/tắt, kèm cảnh báo quyền nhạy cảm. Preset sử dụng `effectiveKeys`/`userCan` trung tâm và vẫn chịu hard barrier.

Task 24 thêm checklist workload trên profile Nhân sự, yêu cầu `handoffConfirmed` ở server action trước retire và audit metadata bàn giao. Dữ liệu lịch sử không bị xóa; self-retire vẫn bị chặn.

Tasks 26–28 chuyển reporting CTV ưu tiên `collaboratorId`, giữ fallback legacy chỉ để rà soát, thêm filter thiếu ID/chưa đăng ký, portal hiển thị trạng thái hồ sơ/lịch gần nhất/ngày hết phạm vi 6 tháng và phone mask.

Task 30 truyền workload summary từ server layout xuống AppShell để mobile quick bar ưu tiên Việc cần làm khi có workload, nhưng vẫn fallback theo role/permission. Task 33 truyền user vào work queue của dashboard để không hiển thị work item vượt scope.

## Checks

- `pnpm exec tsc --noEmit`: PASS.
- Targeted tests: PASS, 6 files / 14 tests, gồm `staff-promotion.test.ts`.
- Full `pnpm test`: PASS, output recorded at `/tmp/phase4-full-test.log`.
- `pnpm build`: PASS, route optimization completed.
- `git diff --check`: PASS.

## Promotion effective date

Task 25 dùng `StaffRoleHistory.changedAt` làm ngày hiệu lực, nhận từ trường `effectiveDate` do ADMIN nhập; nếu bỏ trống, hệ thống dùng thời điểm ghi nhận. Audit `PROMOTE_STAFF` lưu cùng effectiveAt. Helper `staff-promotion.ts` có test cho diff và fallback ngày.
