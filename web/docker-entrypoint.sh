#!/bin/sh
# Khởi động container: chờ DB, chạy migration, nạp dữ liệu mẫu lần đầu, rồi start app.
set -e

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
