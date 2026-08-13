# Cài đặt ZenithTasks cho một phòng khám

1. Chuẩn bị Docker, PostgreSQL 16, domain HTTPS và thư mục backup riêng.
2. Tạo `.env` từ `web/.env.example`; sinh `AUTH_SECRET`, `PHONE_ENC_KEY`, `CHANNEL_TOKEN_ENC_KEY` bằng secret manager hoặc trình sinh mật mã an toàn.
3. Chạy `docker compose up -d --build`.
4. Chạy `docker compose exec app sh -lc 'cd /app && npx prisma migrate deploy'`.
5. Tạo tài khoản ADMIN riêng, bật TOTP, đổi mật khẩu demo nếu seed được dùng.
6. Mở `/setup` hoặc `/he-thong` để nhập thương hiệu, hotline, logo, chính sách và dịch vụ.

Không dùng seed/demo trên database bệnh nhân thật. Mỗi phòng khám phải có database, volume media, volume secret và backup riêng.
