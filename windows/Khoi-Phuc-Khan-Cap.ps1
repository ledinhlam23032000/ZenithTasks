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
# LUU Y: KHONG dat $ErrorActionPreference = 'Stop' o day. Git/Docker ghi ca
# thong bao BINH THUONG ra luong stderr (vd "From https://github.com/..."),
# ma khi ket hop voi "2>&1" thi PowerShell boc chung thanh ErrorRecord ->
# 'Stop' se coi do la loi nghiem trong va dung script giua chung DU LENH DA
# CHAY THANH CONG. Dung $LASTEXITCODE sau tung lenh de kiem tra that/bai
# (giong Sua-Loi.ps1 - cach nay da chay on dinh).
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

Write-Host "`n[1/4] Dua ma nguon ve dung nhanh $Branch (thoat vong lap nhanh sai)..." -ForegroundColor Cyan
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

# QUAN TRONG - PHAI dung container app TRUOC khi go ket migration.
# Ly do (da gap that ngay 17/08): container app cu chay voi co che tu khoi dong
# lai (restart: unless-stopped) va dang lap vo tan o buoc migrate deploy. Ban
# IMAGE CU con chua migration 20260801090000_omnichannel_inbox trong thu muc
# prisma/migrations. Neu go ket (danh dau rolled-back) trong LUC no van chay,
# migration do lap tuc tro lai trang thai "cho ap dung" duoi con mat cua image
# cu -> no thu chay lai -> that bai lan nua -> tao ban ghi loi MOI. Ket qua:
# go ket xong van ket y nguyen, chi khac moc thoi gian.
Write-Host "`n[2/4] Dung ung dung cu lai (de no khong tu chay lai migration loi trong luc dang go ket)..." -ForegroundColor Cyan
docker compose stop app 2>&1 | Write-Host

Write-Host "`n[3/4] Xoa danh dau 'cap nhat CSDL that bai' cu (KHONG dung den du lieu khach hang/ho so)..." -ForegroundColor Cyan
docker compose up -d db
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nKHONG KHOI DONG DUOC CO SO DU LIEU. Bao ky thuat." -ForegroundColor Red
  EndHere 1
}
Start-Sleep -Seconds 10
docker compose run --rm --entrypoint sh app -c "npx prisma migrate resolve --rolled-back $StuckMigration" 2>&1 | Write-Host
Write-Host "(Neu dong tren ghi 'not in a failed state'/da duoc xu ly tu truoc thi KHONG sao ca - cu de script chay tiep.)" -ForegroundColor DarkGray

# Kiem chung THAT SU da het ban ghi migration loi chua, thay vi tin la lenh tren
# da chay xong nghia la xong (chinh cho nay da lam hong lan truoc).
$conKet = (docker compose exec -T db sh -c 'psql -tAU "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from _prisma_migrations where finished_at is null and rolled_back_at is null;"' 2>&1 | Out-String).Trim()
if ($conKet -ne "0") {
  Write-Host "`nVAN CON $conKet ban ghi cap nhat CSDL bi loi - chua go ket duoc." -ForegroundColor Red
  Write-Host "DUNG LAI de khong build tiep vo ich. Gui man hinh nay cho ky thuat." -ForegroundColor Yellow
  EndHere 1
}
Write-Host "OK - da het ban ghi cap nhat CSDL bi loi." -ForegroundColor Green

Write-Host "`n[4/4] Chay cap nhat day du (build lai + khoi dong + ap dung CSDL)..." -ForegroundColor Cyan
Write-Host "(Buoc nay co the mat 5-15 phut, dung tat cua so.)" -ForegroundColor DarkGray
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Dir "windows\Sua-Loi.ps1")
