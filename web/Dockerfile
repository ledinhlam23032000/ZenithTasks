# syntax=docker/dockerfile:1
# Zenith Clinic — image chạy được cả app Next.js lẫn migrate/seed Prisma.

# ---------- base ----------
FROM node:22-slim AS base
# postgresql-client-16 (khớp đúng major version với service "db" trong docker-compose.yml)
# — cần cho scripts/backup.mjs (pg_dump). Debian bookworm mặc định chỉ có client v15,
# dùng client CŨ hơn server là hướng KHÔNG được PostgreSQL đảm bảo tương thích, nên phải
# thêm kho APT chính thức của postgresql.org để lấy đúng bản 16. curl/gnupg chỉ dùng tạm
# lúc cài rồi gỡ ngay để image gọn.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl gnupg \
  && install -d /usr/share/postgresql-common/pgdg \
  && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  && . /etc/os-release && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
  && apt-get purge -y --auto-remove curl gnupg \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps (cache layer) ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Bỏ ký tự CR (\r) phòng khi file bị checkout dạng CRLF trên Windows — nếu không
# dòng "#!/bin/sh" sẽ hỏng và container không khởi động được.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
