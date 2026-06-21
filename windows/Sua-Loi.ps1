# ============================================================================
#  SỬA LỖI / CẬP NHẬT SẠCH — Zenith Clinic (Trung tâm PTTH Thẩm mỹ, BVĐK Hồng Phúc)
#
#  Dùng khi: ứng dụng báo "lỗi máy chủ", không mở được hồ sơ, hoặc cập nhật bị
#  lỡ dở. Script này TẢI LẠI mã mới nhất, BUILD LẠI TỪ ĐẦU (không dùng cache) và
#  KHỞI ĐỘNG LẠI container — đảm bảo mã nguồn, Prisma client và cơ sở dữ liệu khớp nhau.
#
#  KHÔNG mất dữ liệu: chỉ dựng lại ứng dụng, dữ liệu nằm trong volume Docker riêng.
# ============================================================================
$ErrorActionPreference = "Stop"
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "claude/lucid-cori-fg136w"
$Dir    = Join-Path $HOME "ZenithTasks"

function Step($m) { Write-Host "`n=> $m" -ForegroundColor Cyan }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SỬA LỖI / CẬP NHẬT SẠCH - ZENITH CLINIC" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# --- Kiểm tra công cụ ---
foreach ($t in @("git", "docker")) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
    Write-Host "Thiếu '$t'. Hãy chạy file Chay-Zenith.bat một lần để cài đầy đủ." -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"; exit 1
  }
}

# --- Docker phải đang chạy ---
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop chưa chạy. Mở Docker Desktop, đợi biểu tượng cá voi xanh rồi chạy lại file này." -ForegroundColor Yellow
  Read-Host "Nhấn Enter để thoát"; exit 1
}

# --- Lấy mã mới nhất (ép khớp đúng bản trên máy chủ, tránh kẹt do xung đột) ---
Step "[1/4] Tải lại mã nguồn mới nhất..."
if (Test-Path $Dir) {
  git -C $Dir fetch origin $Branch
  git -C $Dir reset --hard "origin/$Branch"
} else {
  git clone $Repo $Dir
  git -C $Dir checkout $Branch
}
if ($LASTEXITCODE -ne 0) { Write-Host "Tải mã thất bại (kiểm tra mạng/GitHub)." -ForegroundColor Red; Read-Host "Nhấn Enter để thoát"; exit 1 }

Set-Location $Dir

# --- Build lại TỪ ĐẦU (không cache) — tạo lại Prisma client + bản build mới ---
Step "[2/4] Dựng lại ứng dụng từ đầu (lâu ~5-15 phút lần đầu)..."
docker compose build --no-cache app
if ($LASTEXITCODE -ne 0) {
  Write-Host "`n❌ BUILD THẤT BẠI — ứng dụng VẪN đang chạy bản cũ (không bị hỏng thêm)." -ForegroundColor Red
  Write-Host "   Thường do máy thiếu RAM khi build. Hãy đóng bớt ứng dụng rồi chạy lại file này," -ForegroundColor Yellow
  Write-Host "   hoặc báo kỹ thuật. KHÔNG mất dữ liệu." -ForegroundColor Yellow
  Read-Host "Nhấn Enter để thoát"; exit 1
}

# --- Khởi động lại container (migration tự chạy khi khởi động) ---
Step "[3/4] Khởi động lại (tự áp dụng cập nhật cơ sở dữ liệu)..."
docker compose up -d --force-recreate
if ($LASTEXITCODE -ne 0) { Write-Host "Khởi động thất bại. Xem log: docker compose logs app" -ForegroundColor Red; Read-Host "Nhấn Enter để thoát"; exit 1 }

# --- Chờ ứng dụng phản hồi ---
Step "[4/4] Kiểm tra ứng dụng đã chạy..."
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3 | Out-Null; $ok = $true; break }
  catch { Start-Sleep 3 }
}

Write-Host ""
if ($ok) {
  Write-Host "================ ĐÃ SỬA XONG ================" -ForegroundColor Green
  Write-Host " Mở:  http://localhost:3000" -ForegroundColor Green
  Write-Host " Nếu vẫn lỗi 1 trang, bấm Ctrl+F5 để tải lại." -ForegroundColor Green
  try { Start-Process "http://localhost:3000" } catch {}
} else {
  Write-Host "Ứng dụng chưa phản hồi. Xem log để biết chi tiết:" -ForegroundColor Yellow
  Write-Host "   docker compose logs --tail=50 app" -ForegroundColor Yellow
}
Read-Host "Nhấn Enter để đóng"
