# ============================================================================
#  KHOI PHUC KHAN CAP - Zenith Clinic
#  Dung MOT LAN de thoat 2 su co cong don ngay 14-15/08/2026:
#   1) May dang ket o nhanh Git sai ("master" - khong ton tai) do 1 cong cu
#      khac tung sua nham, khien Sua-Loi.bat cu bi ket vong lap khong tu
#      thoat ra duoc.
#   2) Co so du lieu con 1 ban ghi "cap nhat that bai" (migration
#      20260801090000_omnichannel_inbox, khong con trong ma nguon) chan moi
#      cap nhat CSDL moi.
#  Sau khi chay file nay xong xuoi, CAC LAN SAU chi can dung Sua-Loi.bat
#  binh thuong (da duoc sua o cung dot nay de tu dung lai + bao loi ro rang
#  neu gap su co tuong tu, khong con am tham chay tiep nua).
# ============================================================================
$ErrorActionPreference = 'Stop'
$Branch = "claude/lucid-cori-fg136w"
$Dir    = Join-Path $HOME "ZenithTasks"
$StuckMigration = "20260801090000_omnichannel_inbox"

function EndHere($code) { Write-Host ""; Read-Host "Nhan Enter de dong cua so"; exit $code }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  KHOI PHUC KHAN CAP - ZENITH CLINIC" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

foreach ($t in @("git", "docker")) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
    Write-Host "Thieu '$t'. Hay chay Chay-Zenith.bat mot lan de cai day du roi thu lai." -ForegroundColor Red
    EndHere 1
  }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop chua chay. Mo Docker Desktop, doi bieu tuong ca voi mau xanh roi chay lai file nay." -ForegroundColor Yellow
  EndHere 1
}

if (-not (Test-Path $Dir)) {
  Write-Host "Chua thay thu muc $Dir. Hay chay Chay-Zenith.bat mot lan de cai lan dau, roi moi chay file nay." -ForegroundColor Red
  EndHere 1
}

Write-Host "`n[1/3] Dua may nguon ve dung nhanh $Branch (thoat vong lap nhanh sai)..." -ForegroundColor Cyan
git -C $Dir fetch origin $Branch --prune 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nKHONG TAI DUOC MA NGUON MOI (fetch that bai). Kiem tra mang roi chay lai file nay." -ForegroundColor Red
  EndHere 1
}
git -C $Dir reset --hard "origin/$Branch" 2>&1 | Write-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nKHONG DUA DUOC VE DUNG NHANH (reset that bai). Bao ky thuat kem dong loi mau do o tren." -ForegroundColor Red
  EndHere 1
}
Set-Location $Dir

Write-Host "`n[2/3] Xoa danh dau 'cap nhat CSDL that bai' cu (KHONG dung den du lieu khach hang/ho so)..." -ForegroundColor Cyan
docker compose up -d db
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nKHONG KHOI DONG DUOC CO SO DU LIEU. Bao ky thuat." -ForegroundColor Red
  EndHere 1
}
Start-Sleep -Seconds 10
docker compose run --rm --entrypoint sh app -c "npx prisma migrate resolve --rolled-back $StuckMigration" 2>&1 | Write-Host
Write-Host "(Neu dong tren ghi 'not in a failed state'/da duoc xu ly tu truoc thi KHONG sao ca — cu de script chay tiep.)" -ForegroundColor DarkGray

Write-Host "`n[3/3] Chay cap nhat day du (build lai + khoi dong + ap dung CSDL)..." -ForegroundColor Cyan
Write-Host "(Buoc nay co the mat 5-15 phut, dung tat cua so.)" -ForegroundColor DarkGray
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dir "windows\Sua-Loi.ps1")
