#!/usr/bin/env bash
# ============================================================================
#  Cài đặt app phòng khám trên VPS Ubuntu/Debian — CHẠY 1 LỆNH.
#  Tự: cài Docker + Git, tạo swap (nếu RAM thấp), tải mã nguồn, bật app + HTTPS.
#
#  Cách chạy (đăng nhập VPS với quyền root, rồi dán):
#     curl -fsSL https://raw.githubusercontent.com/ledinhlam23032000/ZenithTasks/master/deploy/cai-dat-vps.sh | bash
# ============================================================================
set -e

REPO="https://github.com/ledinhlam23032000/ZenithTasks.git"
BRANCH="master"
DIR="/opt/zenith"

echo "==> [1/5] Cài gói cần thiết (git, curl)..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y -qq
  apt-get install -y -qq git curl ca-certificates
fi

echo "==> [2/5] Tạo swap nếu RAM thấp (giúp build không bị treo)..."
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 4096)
if [ "$MEM_MB" -lt 3000 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    Đã tạo swap 2GB."
fi

echo "==> [3/5] Cài Docker (nếu chưa có)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> [4/5] Tải mã nguồn về $DIR ..."
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin "$BRANCH"
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi

echo "==> [5/5] Khởi động (lần đầu build ~5–10 phút, vui lòng đợi)..."
cd "$DIR/deploy"
docker compose up -d --build

echo ""
echo "==================== ĐÃ XONG ===================="
echo " Mở trình duyệt:"
echo "   https://trungtamphauthuattaohinhvathammybenhviendakhoahongphuc.xyz"
echo " (Chờ thêm 1–2 phút để Caddy lấy chứng chỉ HTTPS lần đầu.)"
echo ""
echo " Đăng nhập lần đầu:  admin / 123456   ->  ĐỔI MẬT KHẨU NGAY"
echo " Cập nhật sau này:   chạy lại đúng lệnh cài đặt này."
echo "================================================="
