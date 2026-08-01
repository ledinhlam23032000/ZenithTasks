#!/bin/sh
# Khởi động container: chờ DB, chạy migration, nạp dữ liệu mẫu lần đầu, rồi start app.
set -e

# ---------------------------------------------------------------------------
# KHOÁ BÍ MẬT — tự sinh & lưu trong volume (KHÔNG nằm trong mã nguồn/Git).
# Nếu đã cấu hình qua biến môi trường (.env) thì ưu tiên dùng giá trị đó.
# ---------------------------------------------------------------------------
SECRET_DIR="/app/.runtime"
mkdir -p "$SECRET_DIR"
chmod 700 "$SECRET_DIR"

# Tệp hộp thư chứa dữ liệu khách hàng, lưu trong volume riêng và không phục vụ từ public/.
INBOX_ATTACHMENT_ROOT="${INBOX_ATTACHMENT_ROOT:-/app/private/inbox}"
mkdir -p "$INBOX_ATTACHMENT_ROOT"
chmod 700 "$INBOX_ATTACHMENT_ROOT"
export INBOX_ATTACHMENT_ROOT

# AUTH_SECRET (khoá ký phiên đăng nhập) — sinh ngẫu nhiên, an toàn khi đổi
# (chỉ khiến mọi người đăng nhập lại một lần).
if [ -z "$AUTH_SECRET" ]; then
  if [ ! -f "$SECRET_DIR/auth_secret" ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))" > "$SECRET_DIR/auth_secret"
    echo "🔐 Đã tạo AUTH_SECRET ngẫu nhiên (lưu trong volume an toàn)."
  fi
  AUTH_SECRET="$(cat "$SECRET_DIR/auth_secret")"
  export AUTH_SECRET
fi

# PHONE_ENC_KEY (khoá mã hoá SĐT) — KHÔNG tự đổi để dữ liệu cũ vẫn giải mã được.
# Lần đầu dùng khoá tương thích bản cũ; có thể thay bằng .env (cần mã hoá lại dữ liệu).
if [ -z "$PHONE_ENC_KEY" ]; then
  if [ ! -f "$SECRET_DIR/phone_key" ]; then
    printf '%s' "QKuRqi5MjrXaJ6Dv5XwMQCD/0Dmyvc2TuTUEBf8nGM8=" > "$SECRET_DIR/phone_key"
  fi
  PHONE_ENC_KEY="$(cat "$SECRET_DIR/phone_key")"
  export PHONE_ENC_KEY
fi

# CHANNEL_TOKEN_ENC_KEY (AES-256-GCM cho token OAuth) — sinh đúng 32 byte và giữ cố định.
if [ -z "$CHANNEL_TOKEN_ENC_KEY" ]; then
  if [ ! -f "$SECRET_DIR/channel_token_key" ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > "$SECRET_DIR/channel_token_key"
    echo "🔐 Đã tạo khóa mã hóa token kênh trong volume an toàn."
  fi
  CHANNEL_TOKEN_ENC_KEY="$(cat "$SECRET_DIR/channel_token_key")"
  export CHANNEL_TOKEN_ENC_KEY
fi

# Secret gọi tác vụ bảo trì nội bộ — không đưa vào URL, log hay tham số Task Scheduler.
if [ -z "$CHANNEL_MAINTENANCE_SECRET" ]; then
  if [ ! -f "$SECRET_DIR/channel_maintenance_secret" ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64url'))" > "$SECRET_DIR/channel_maintenance_secret"
    echo "🔐 Đã tạo secret bảo trì kênh trong volume an toàn."
  fi
  CHANNEL_MAINTENANCE_SECRET="$(cat "$SECRET_DIR/channel_maintenance_secret")"
  export CHANNEL_MAINTENANCE_SECRET
fi

chmod 600 "$SECRET_DIR"/* 2>/dev/null || true

echo "⏳ Áp dụng migration (chờ cơ sở dữ liệu sẵn sàng)..."
n=0
until npx prisma migrate deploy; do
  n=$((n + 1))
  if [ "$n" -ge 30 ]; then
    echo "❌ Cơ sở dữ liệu không phản hồi sau nhiều lần thử." >&2
    exit 1
  fi
  echo "   ...DB chưa sẵn sàng, thử lại lần $n"
  sleep 2
done

# Chỉ nạp dữ liệu mẫu khi bảng User còn trống (không ghi đè dữ liệu thật).
COUNT=$(node --input-type=commonjs -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query('SELECT COUNT(*)::int AS n FROM \"User\"');process.stdout.write(String(r.rows[0].n));await c.end();}catch(e){process.stdout.write('0');}})();")

if [ "$COUNT" = "0" ]; then
  echo "🌱 Cơ sở dữ liệu trống — nạp dữ liệu mẫu..."
  npm run db:seed
else
  echo "✓ Đã có dữ liệu ($COUNT người dùng) — bỏ qua bước nạp mẫu."
fi

echo "🚀 Khởi động Zenith Clinic tại http://localhost:3000"
exec "$@"
