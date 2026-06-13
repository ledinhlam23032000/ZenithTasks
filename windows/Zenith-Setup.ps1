# ============================================================
#  Zenith Clinic — Cài đặt & chạy trên Windows (server nội bộ)
#  Tự tải mã nguồn, cài Docker (nếu thiếu), rồi chạy ứng dụng.
#  Dữ liệu lưu NGAY TRÊN MÁY NÀY. Mở http://localhost:3000
# ============================================================

$ErrorActionPreference = "Stop"
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "claude/lucid-cori-fg136w"
$Dir    = Join-Path $HOME "ZenithTasks"

function Has($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

# --- Tự xin quyền Quản trị (UAC) để cài được phần mềm ---
$id = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $id.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Đang xin quyền quản trị..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   ZENITH CLINIC - Cai dat tren may nay" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# --- Cần winget (có sẵn trên Windows 10/11 cập nhật) ---
if (-not (Has winget)) {
  Write-Host "Máy chưa có 'winget'. Hãy mở Microsoft Store, cài 'App Installer', rồi chạy lại file này." -ForegroundColor Red
  Read-Host "Nhấn Enter để thoát"; exit
}

# --- 1) Git ---
if (-not (Has git)) {
  Write-Host "[1/4] Cài Git..." -ForegroundColor Yellow
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
  $env:Path += ";C:\Program Files\Git\cmd"
} else { Write-Host "[1/4] Git: OK" -ForegroundColor Green }

# --- 2) Lấy mã nguồn ---
Write-Host "[2/4] Tải/cập nhật mã nguồn..." -ForegroundColor Yellow
if (Test-Path $Dir) {
  git -C $Dir fetch origin $Branch
  git -C $Dir checkout $Branch
  git -C $Dir pull origin $Branch
} else {
  git clone $Repo $Dir
  git -C $Dir checkout $Branch
}

# --- 3) Docker Desktop ---
if (-not (Has docker)) {
  Write-Host "[3/4] Chưa có Docker Desktop — đang cài (có thể cần KHỞI ĐỘNG LẠI máy)..." -ForegroundColor Yellow
  winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
  Write-Host ""
  Write-Host "==> ĐÃ CÀI DOCKER. Hãy: (1) KHỞI ĐỘNG LẠI máy, (2) mở 'Docker Desktop'" -ForegroundColor Green
  Write-Host "    và đợi biểu tượng cá voi chuyển XANH, (3) chạy lại file này." -ForegroundColor Green
  Read-Host "Nhấn Enter để thoát"; exit
} else { Write-Host "[3/4] Docker: OK" -ForegroundColor Green }

# --- Kiểm tra Docker đang chạy ---
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker chưa khởi động. Mở 'Docker Desktop', đợi biểu tượng XANH rồi chạy lại file này." -ForegroundColor Yellow
  Read-Host "Nhấn Enter để thoát"; exit
}

# --- 4) Dựng & chạy ---
Set-Location $Dir
Write-Host "[4/4] Đang dựng & chạy (LẦN ĐẦU mất ~5-10 phút, các lần sau rất nhanh)..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "Đợi ứng dụng sẵn sàng..." -ForegroundColor Yellow
$ok = $false
for ($i = 0; $i -lt 80; $i++) {
  try { Invoke-WebRequest "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 | Out-Null; $ok = $true; break }
  catch { Start-Sleep 3 }
}

Write-Host ""
if ($ok) {
  Start-Process "http://localhost:3000"
  Write-Host "==================================================" -ForegroundColor Green
  Write-Host " THANH CONG! Mo http://localhost:3000" -ForegroundColor Green
  Write-Host " Dang nhap:  admin  /  123456" -ForegroundColor Green
  Write-Host " May khac trong phong kham vao bang:  http://<IP-may-nay>:3000" -ForegroundColor Green
  Write-Host "==================================================" -ForegroundColor Green
} else {
  Write-Host "Ứng dụng vẫn đang khởi động — thử mở http://localhost:3000 sau 1-2 phút." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Để DỪNG ứng dụng: mở thư mục $Dir và chạy:  docker compose down" -ForegroundColor DarkGray
Read-Host "Nhấn Enter để đóng cửa sổ (ứng dụng vẫn chạy nền)"
