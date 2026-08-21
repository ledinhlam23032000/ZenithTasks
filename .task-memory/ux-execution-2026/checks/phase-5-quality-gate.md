# Phase 5 UX quality gate — payment, data quality, telemetry, rollout

- Date: 2026-08-21
- Branch: `feat/ux-execution-1-10`
- Scope: Tasks 16, 17, 20, 32, 34, 35, 36.

## Delivered

- Task 16: payroll rows, CTV monthly rows và chi phí đầu tư có lối tắt tạo `PaymentRequest` trạng thái `PENDING`; ADMIN vẫn phải duyệt trước khi ghi sổ.
- Task 17: PaymentRequest nguồn lương/CTV lưu liên kết `PayrollEntry`/`CommissionPayout`; danh sách và preview chứng từ có backlink về bảng lương, CTV và Sổ thu–chi. Luồng `PAID` không tạo CashTransaction thứ hai nếu đã có liên kết.
- Task 20: ngoài cửa sổ phản hồi, inbox đưa action thay thế gọi lại, Customer 360 hoặc chuyển người phụ trách; không tự gửi tin.
- Task 32: admin thấy summary thiếu ID/chưa đăng ký; legacy CTV có action gán `collaboratorId` rõ ràng, audit số bản ghi cập nhật và xác nhận `moneyRecalculated: false`.
- Task 34: telemetry local-only dùng allowlist field, không lưu tên khách/số điện thoại/nội dung tin; MessageComposer đo start, quick-reply step, complete và abandon.
- Task 35: `UX_QA_MATRIX_2026.md` chứa acceptance matrix theo role và hard gates.
- Task 36: `ux-feature-flags.ts` hỗ trợ rollout theo danh sách `UX_ROLLOUT`, mặc định bật nhóm đã duyệt và không cấp quyền mới.

## Checks

- `pnpm exec tsc --noEmit`: PASS sau khi nối source links và CTV data-quality UI.
- Targeted tests: PASS cho data quality, inbox alternatives, telemetry, feature flags, promotion và payment state.
- Full `pnpm test`: PASS, 65 test files / 360 tests; log `/tmp/phase5-final-test.log`.
- `pnpm build`: PASS; log `/tmp/phase5-final-build.log`.
- `git diff --check`: PASS trong quality gate cuối.

## Safety boundaries

Không tự động áp BOM vật tư. Không tính lại hoa hồng/doanh số khi reconcile ID. PaymentRequest vẫn theo state machine và approval server-side. Feature flag chỉ ẩn/tắt UX; không bypass capability, direct URL hoặc server action gate.
