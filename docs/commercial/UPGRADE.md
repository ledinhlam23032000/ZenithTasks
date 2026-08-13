# Nâng cấp

1. Gắn tag/commit release và đọc migration.
2. Chụp backup database + media + runtime secrets.
3. Chạy unit/lint/typecheck/build/E2E trên staging.
4. Chạy `npx prisma migrate deploy` trong container mới.
5. Smoke test login/2FA, booking, hồ sơ, media, payment và kho.
6. Theo dõi log và giữ image trước để rollback khi schema tương thích.

Không chạy `migrate reset` trên production. Migration phá dữ liệu phải có kế hoạch riêng được phê duyệt.
