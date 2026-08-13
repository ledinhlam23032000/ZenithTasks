## Mục tiêu

Đưa ZenithTasks từ bản audit nội bộ lên một nhánh triển khai thương mại hóa có kiểm soát, tập trung vào bảo mật hồ sơ, quyền theo vai trò, tồn kho, thanh toán, archive, cấu hình phòng khám, UI responsive, E2E scaffolding và vận hành.

## Các thay đổi chính

- Thêm báo cáo Red Team, ma trận quyền, release gates, deployment runbook và tài liệu thương mại.
- Thêm scoped authorization cho case, case child và media; tách capability lâm sàng, tài chính, portal và báo cáo aggregate.
- Bắt buộc 2FA cho nhóm quyền nhạy cảm và bổ sung audit/scope cho media.
- Đồng bộ BOM, stock movement, reversal, idempotent payment, void payment và archive customer/case.
- Thêm cấu hình clinic typed, branding, metadata/manifest runtime và wizard setup.
- Cải thiện sidebar theo nhóm, patient timeline, customer detail theo quyền và booking giữ dữ liệu khi lỗi.
- Thêm Playwright config/scenarios an toàn, chỉ chạy real flow khi bật rõ `E2E_RUN_REAL=true`.
- Thêm installation, admin, role, backup/restore, upgrade, troubleshooting, support và demo runbooks.

## Kiểm thử

- Prisma validate: PASS.
- Vitest: 24 files / 95 tests PASS.
- ESLint toàn source: PASS trong container kiểm thử sạch.
- TypeScript: PASS trong container kiểm thử sạch với dependency E2E đầy đủ.
- Playwright safe mode: discover/skip 8 instances khi không có test database.
- Next build: compile PASS; bước cuối cần xác nhận lại trên CI/máy đủ tài nguyên.

Chi tiết và các gate còn mở nằm ở `docs/COMMERCIAL-VERIFICATION-REPORT.md`.

## Database, rollback và dữ liệu

- Có migration mới nhưng chưa apply trên production.
- Trước khi rollout phải backup database/media, chạy `prisma migrate deploy` trên staging, kiểm tra invariant rồi mới rollout.
- Rollback ứng dụng theo image/commit trước; không dùng `migrate reset` và không hard-delete dữ liệu nghiệp vụ.
- Secret `PHONE_ENC_KEY-20260629-122122.txt` bị loại khỏi commit.

## Điều kiện merge

Draft PR này cần review security, migration, backup/restore và chạy E2E trên database giả trước khi chuyển ready-for-review.

