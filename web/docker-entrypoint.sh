#!/bin/sh
# Khởi động container: chờ DB, chạy migration, bootstrap an toàn, rồi start app.
set -e

# ---------------------------------------------------------------------------
# KHOÁ BÍ MẬT — tự sinh & lưu trong volume (KHÔNG nằm trong mã nguồn/Git).
# Nếu đã cấu hình qua biến môi trường (.env) thì ưu tiên dùng giá trị đó.
# ---------------------------------------------------------------------------
SECRET_DIR="/app/.runtime"
mkdir -p "$SECRET_DIR"

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

# PHONE_ENC_KEY (khoá mã hoá SĐT) — không dùng fallback cố định trong source.
# Nếu chưa cấu hình, sinh một khoá ngẫu nhiên và giữ trong volume secrets.
# Với dữ liệu cũ, phải cung cấp đúng PHONE_ENC_KEY cũ qua secret manager/.env.
if [ -z "$PHONE_ENC_KEY" ]; then
  if [ ! -f "$SECRET_DIR/phone_key" ] && [ "${ZENITH_ALLOW_NEW_PHONE_KEY:-false}" = "true" ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > "$SECRET_DIR/phone_key"
    echo "🔐 Đã tạo khóa mã hóa số điện thoại trong volume an toàn."
  fi
  if [ -f "$SECRET_DIR/phone_key" ]; then
    PHONE_ENC_KEY="$(cat "$SECRET_DIR/phone_key")"
    export PHONE_ENC_KEY
  fi
fi

# Avatar migration follows the same private volume as clinical files.
export ZENITH_UPLOADS_DIR="${UPLOAD_DIR:-/app/private/uploads}"

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

# Bổ sung idempotent Giấy đề nghị thanh toán cho các khoản Chi lịch sử chưa có chứng từ.
# Chạy sau migration và không tạo trùng: dòng đã có paymentRequestId sẽ được bỏ qua.
# Lỗi được ghi log nhưng không chặn app khởi động; lần restart sau sẽ tự thử lại.
if [ -f /app/scripts/backfill-cash-payment-requests.ts ]; then
  ./node_modules/.bin/tsx /app/scripts/backfill-cash-payment-requests.ts || echo "⚠️ Backfill chứng từ cũ chưa hoàn tất; sẽ thử lại ở lần khởi động sau."
fi

# Tự bổ sung Phiếu tư vấn mặc định cho hồ sơ điều trị cũ chưa có ConsultationRecord.
# Script idempotent: hồ sơ đã có phiếu sẽ được bỏ qua, lỗi không chặn app khởi động.
if [ -f /app/scripts/backfill-consultation-sheets.ts ]; then
  ./node_modules/.bin/tsx /app/scripts/backfill-consultation-sheets.ts || echo "⚠️ Backfill Phiếu tư vấn chưa hoàn tất; sẽ thử lại ở lần khởi động sau."
fi

# Nếu CSDL còn phoneEnc mà secret/biến môi trường bị mất thì dừng, không chạy
# bằng khóa mới khiến dữ liệu cũ không thể giải mã. Chỉ tạo khóa tự động cho CSDL mới.
if [ -z "$PHONE_ENC_KEY" ]; then
  if ! PHONE_ROWS=$(node --input-type=commonjs -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query('SELECT ((SELECT COUNT(*) FROM \"Customer\" WHERE \"phoneEnc\" IS NOT NULL)+(SELECT COUNT(*) FROM \"Appointment\" WHERE \"phoneEnc\" IS NOT NULL))::int AS n');process.stdout.write(String(r.rows[0].n));await c.end();}catch(e){process.stderr.write(String(e&&e.message||e));process.exitCode=1;}})();"); then
    echo "Khong kiem tra duoc du lieu phoneEnc; dung khoi dong." >&2
    exit 1
  fi
  if [ "$PHONE_ROWS" != "0" ]; then
    echo "Thieu PHONE_ENC_KEY/volume secret trong khi CSDL con $PHONE_ROWS ban ghi phoneEnc; dung khoi dong." >&2
    exit 1
  fi
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > "$SECRET_DIR/phone_key"
  PHONE_ENC_KEY="$(cat "$SECRET_DIR/phone_key")"
  export PHONE_ENC_KEY
fi

# Dọn lưu trữ ảnh đại diện cũ (nếu có) — xem chi tiết trong chính script. An toàn chạy
# lại nhiều lần; lỗi ở bước này KHÔNG chặn khởi động (không phải dữ liệu nghiệp vụ).
if [ -f /app/scripts/migrate-avatar-storage.mjs ]; then
  node /app/scripts/migrate-avatar-storage.mjs || true
fi

# Chỉ nạp dữ liệu mẫu khi bảng User còn trống (không ghi đè dữ liệu thật).
# QUAN TRỌNG: nếu câu đếm LỖI (mất kết nối, quyền truy vấn...) phải DỪNG hẳn —
# TUYỆT ĐỐI không được coi lỗi = "0 người dùng" rồi chạy seed (seed xoá sạch bảng
# trước khi nạp mẫu → có thể xoá mất dữ liệu thật của phòng khám đang chạy).
# Dùng `if ! COUNT=$(...)` (không gán trần) vì script chạy dưới `set -e`: gán trần
# thất bại sẽ khiến shell (dash) thoát NGAY tại dòng đó, không kịp in cảnh báo dưới đây.
if ! COUNT=$(node --input-type=commonjs -e "const {Client}=require('pg');(async()=>{try{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query('SELECT COUNT(*)::int AS n FROM \"User\"');process.stdout.write(String(r.rows[0].n));await c.end();}catch(e){process.stderr.write(String(e&&e.message||e));process.stdout.write('ERROR');process.exitCode=1;}})();"); then
  echo "❌ Không đếm được số người dùng hiện có trong CSDL — DỪNG khởi động để tránh nạp đè dữ liệu thật." >&2
  echo "   (Migration ở bước trên đã chạy xong; lỗi này thường do CSDL chập chờn ngay sau đó. Khởi động lại container để thử lại.)" >&2
  exit 1
fi

if [ "$COUNT" = "0" ]; then
  if [ "${ALLOW_DEMO_SEED:-false}" = "true" ]; then
    echo "⚠️ ALLOW_DEMO_SEED=true — chỉ dùng cho QA với dữ liệu giả."
    npm run db:seed
  elif [ -n "${BOOTSTRAP_ADMIN_USERNAME:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
    echo "🔐 Cơ sở dữ liệu trống — tạo tài khoản quản trị bootstrap..."
    npm run db:bootstrap-admin
  else
    echo "❌ CSDL chưa có tài khoản. Hãy cấu hình BOOTSTRAP_ADMIN_USERNAME/BOOTSTRAP_ADMIN_PASSWORD (>=12 ký tự), hoặc chỉ bật ALLOW_DEMO_SEED=true trong môi trường QA." >&2
    exit 1
  fi
else
  echo "✓ Đã có dữ liệu ($COUNT người dùng) — bỏ qua bước nạp mẫu."
fi

# ---------------------------------------------------------------------------
# SAO LƯU TỰ ĐỘNG (A5) — chạy nền: 1 lần lúc khởi động rồi mỗi 24 giờ.
# Ghi vào volume .runtime; trang /he-thong hiện "lần sao lưu gần nhất".
# (Sao lưu RA NGOÀI Google Drive/USB vẫn dùng windows/Sao-Luu.ps1.)
# ---------------------------------------------------------------------------
if [ -f /app/scripts/backup.mjs ]; then
  (
    while true; do
      node /app/scripts/backup.mjs >> "$SECRET_DIR/backup.log" 2>&1 || true
      sleep 86400
    done
  ) &
  echo "🗄️  Đã bật sao lưu tự động hằng ngày (xem trang Tình trạng hệ thống)."
fi

echo "🚀 Khởi động Zenith Clinic trên cổng nội bộ 3000 (origin host: http://127.0.0.1:3000)"
exec "$@"
