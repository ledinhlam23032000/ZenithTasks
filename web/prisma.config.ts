// Cấu hình Prisma CLI. Prisma 7 không tự nạp .env nên ta nạp thủ công qua dotenv.
// URL kết nối được khai báo ở đây cho Migrate; ứng dụng lúc chạy dùng driver
// adapter (@prisma/adapter-pg) — xem src/lib/db.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
