# Deployment runbook

## Mô hình

Mỗi phòng khám chạy một app instance, database PostgreSQL và storage media riêng. Không dùng dữ liệu thật trong staging hoặc E2E.

## Trước khi triển khai

1. Xác nhận commit/tag cần phát hành.
2. Chạy typecheck, unit test, lint, build và E2E.
3. Kiểm tra migration mới.
4. Tạo backup database và media.
5. Kiểm tra secret runtime không nằm trong source/artifact.
6. Kiểm tra health endpoint và kết nối database.

## Migration

```powershell
docker exec <app-container> sh -lc 'cd /app && npx prisma migrate deploy'
```

Không chạy `migrate reset` trên môi trường có dữ liệu thật. Nếu migration fail, dừng rollout, giữ app cũ nếu tương thích, và dùng backup/rollback runbook.

## Backup/restore drill

- Backup database định kỳ và trước mỗi migration.
- Backup media cùng phiên bản database.
- Kiểm tra checksum hoặc kết quả upload.
- Khôi phục vào môi trường cô lập.
- Mở thử login, customer, case, photo, payment và report.
- Ghi thời gian khôi phục và kết quả vào release record.

## Sau khi triển khai

1. Kiểm tra login và 2FA.
2. Kiểm tra public booking.
3. Kiểm tra tạo customer/case trong staging smoke.
4. Kiểm tra media authorization.
5. Kiểm tra stock/payment invariant.
6. Theo dõi logs, failed actions, auth denials, backup và integration health.

## Rollback

- Không xóa database để rollback.
- Dừng rollout nếu smoke test fail.
- Quay lại image/app version trước nếu schema tương thích.
- Nếu schema đã thay đổi, dùng phương án migration rollback đã được kiểm thử hoặc restore vào instance cô lập rồi chuyển traffic.
- Ghi lại incident và không retry mù.

