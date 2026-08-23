# ============================================================================
#  SUA LOI / CAP NHAT SACH - Zenith Clinic (Trung tam PTTH Tham my, BVDK Hong Phuc)
#  Tai lai ma moi nhat + dung lai tu dau (khong cache) + ap dung cap nhat CSDL.
#  KHONG mat du lieu (du lieu nam trong volume Docker rieng).
# ============================================================================
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "master"
$Dir    = Join-Path $HOME "ZenithTasks"
$Stamp  = Get-Date -Format "yyyyMMdd-HHmmss"

function EndHere($code) { Write-Host ""; Read-Host "Nhan Enter de dong cua so"; exit $code }

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  SUA LOI / CAP NHAT SACH - ZENITH CLINIC" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

foreach ($t in @("git", "docker")) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
    Write-Host "Thieu '$t'. Hay chay Chay-Zenith.bat mot lan de cai day du." -ForegroundColor Red
    EndHere 1
  }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop chua chay. Mo Docker Desktop, doi bieu tuong ca voi mau xanh roi chay lai file nay." -ForegroundColor Yellow
  EndHere 1
}

Write-Host "`n[1/4] Tai lai ma nguon moi nhat..." -ForegroundColor Cyan
if (Test-Path $Dir) {
  $fetchOutput = & git -C $Dir fetch origin $Branch 2>&1
  $fetchOutput | Write-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Khong tai duoc origin/$Branch; giu nguyen ban dang chay." -ForegroundColor Red
    EndHere 1
  }
  # Bao ve moi thay doi local truoc khi dua branch ve master.
  # Khong reset khi chua stash: schema.prisma va cac file owner dang sua phai duoc giu nguyen.
  $beforeHead = (& git -C $Dir rev-parse HEAD 2>$null).Trim()
  $dirty = & git -C $Dir status --porcelain --untracked-files=all
  $backupBranch = $null
  $stashRefBeforeRaw = & git -C $Dir rev-parse -q --verify refs/stash 2>$null
  $stashRefBefore = if ($stashRefBeforeRaw) { ([string]$stashRefBeforeRaw).Trim() } else { $null }
  if ($dirty) {
    $backupBranch = "backup/sua-loi-$Stamp"
    $backupOutput = & git -C $Dir branch $backupBranch $beforeHead 2>&1
    $backupOutput | Write-Host
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Khong tao duoc backup branch cho thay doi local; dung de tranh mat du lieu." -ForegroundColor Red
      EndHere 1
    }
    # Hồ sơ Chrome QA có Cookies/Local Storage thường bị Chrome khóa. Đây là dữ liệu
    # kiểm thử cục bộ, không phải mã nguồn; không đưa vào stash để tránh làm hỏng
    # quy trình cập nhật. Các thay đổi tracked và untracked khác vẫn được bảo vệ.
    $stashOutput = & git -C $Dir stash push --include-untracked -m "Sua-Loi $Stamp - bao luu thay doi local truoc khi cap nhat master" -- . ':(exclude)checks/qa-chrome-profile/**' 2>&1
    $stashOutput | Write-Host
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Khong bao luu duoc thay doi local; dung de tranh mat du lieu." -ForegroundColor Red
      EndHere 1
    }
  }
  $stashRefAfterRaw = & git -C $Dir rev-parse -q --verify refs/stash 2>$null
  $stashRefAfter = if ($stashRefAfterRaw) { ([string]$stashRefAfterRaw).Trim() } else { $null }
  $stashCreated = $dirty -and $stashRefAfter -and ($stashRefAfter -ne $stashRefBefore)
  if ($stashCreated) {
    Write-Host "Da bao ve thay doi local truoc khi cap nhat (khong tu dong khoi phuc de tranh de len master)." -ForegroundColor Yellow
    if ($dirty -match 'checks/qa-chrome-profile') {
      Write-Host "Bo qua checks/qa-chrome-profile vi day la ho so Chrome QA co file dang bi khoa; khong xoa va khong ghi de." -ForegroundColor Yellow
    }
    Write-Host "Backup branch: $backupBranch" -ForegroundColor Yellow
    Write-Host "Stash: $stashRefAfter" -ForegroundColor Yellow
    Write-Host "Sau khi cap nhat on dinh, xem lai: git stash list" -ForegroundColor Yellow
    Write-Host "Chi khoi phuc stash sau khi kiem tra tung file; khong tu dong pop de tranh de len master." -ForegroundColor Yellow
  }
  # Dua branch local ve dung master. Khong git clean de khong xoa log/QA/.env cua owner.
  $checkoutOutput = & git -C $Dir checkout -B $Branch "origin/$Branch" 2>&1
  $checkoutOutput | Write-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Khong chuyen duoc branch local sang $Branch; giu nguyen ban dang chay." -ForegroundColor Red
    EndHere 1
  }
  $resetOutput = & git -C $Dir reset --hard "origin/$Branch" 2>&1
  $resetOutput | Write-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Khong reset duoc ma nguon ve origin/$Branch; giu nguyen ban dang chay." -ForegroundColor Red
    EndHere 1
  }
  $untracked = & git -C $Dir status --short --untracked-files=all
  if ($untracked) {
    Write-Host "Canh bao: co file local chua theo doi; script khong tu dong xoa:" -ForegroundColor Yellow
    $untracked | Select-Object -First 20 | Write-Host
  }
} else {
  git clone $Repo $Dir 2>&1 | Write-Host
  if ($LASTEXITCODE -ne 0) { Write-Host "Clone that bai." -ForegroundColor Red; EndHere 1 }
  git -C $Dir checkout $Branch 2>&1 | Write-Host
  if ($LASTEXITCODE -ne 0) { Write-Host "Checkout $Branch that bai." -ForegroundColor Red; EndHere 1 }
}
Set-Location $Dir

# pnpm tren Windows co the tao workspace metadata tam khi can allowBuilds.
# Repo nay la mot package duy nhat; file nay khong thuoc source master va lam
# pnpm exec o build stage bao "packages field missing or empty".
foreach ($strayName in @("pnpm-workspace.yaml", "pnpm-workspace.yml")) {
  $strayWorkspace = Join-Path (Join-Path $Dir "web") $strayName
  if (Test-Path $strayWorkspace) {
    Write-Host "Xoa workspace metadata khong thuoc repo: $strayWorkspace" -ForegroundColor Yellow
    Remove-Item -LiteralPath $strayWorkspace -Force -ErrorAction Stop
  }
}

Write-Host "`n[2/4] Dung lai ung dung tu dau (lau ~5-15 phut, vui long cho - dung tat)..." -ForegroundColor Cyan
# Docker Compose ban moi co the chuyen build qua Bake. Tren mot so may Windows,
# Bake bi ngat voi ma 0xc000013a du build chua xong. Tat Bake va gom ca stdout/stderr
# vao log co timestamp de lay duoc loi that thay vi thong bao tong quat.
$env:COMPOSE_BAKE = "false"
$BuildLog = Join-Path $Dir "docker-build-$Stamp.log"
Write-Host "Log build: $BuildLog" -ForegroundColor DarkGray
$buildOutput = & docker compose build --no-cache app 2>&1
$buildExit = $LASTEXITCODE
$buildOutput | Tee-Object -FilePath $BuildLog
if ($buildExit -ne 0) {
  Write-Host "`nBUILD THAT BAI - ung dung VAN chay ban cu (khong hong them)." -ForegroundColor Red
  Write-Host "Ma loi build: $buildExit" -ForegroundColor Yellow
  Write-Host "Log chi tiet: $BuildLog" -ForegroundColor Yellow
  Write-Host "Neu ma loi la 0xc000013a, tien trinh build da bi ngat truoc khi Next.js bao loi; vui long khong dong cua so va chay lai sau khi Docker Desktop on dinh." -ForegroundColor Yellow
  EndHere 1
}

Write-Host "`n[3/4] Khoi dong lai + ap dung cap nhat co so du lieu..." -ForegroundColor Cyan
docker compose up -d --force-recreate
if ($LASTEXITCODE -ne 0) {
  Write-Host "Khong khoi dong duoc container; ung dung ban cu van duoc giu nguyen." -ForegroundColor Red
  EndHere 1
}
Start-Sleep -Seconds 10
Write-Host "Ap dung migration:" -ForegroundColor Cyan
$MigrationLog = Join-Path $Dir "docker-migrate-$Stamp.log"
$migrationOutput = & docker compose exec -T app npx prisma migrate deploy 2>&1
$migrationExit = $LASTEXITCODE
$migrationOutput | Tee-Object -FilePath $MigrationLog
if ($migrationExit -ne 0) {
  Write-Host "Migration that bai (ma $migrationExit). Khong tiep tuc smoke test." -ForegroundColor Red
  Write-Host "Log migration: $MigrationLog" -ForegroundColor Yellow
  EndHere 1
}

Write-Host "`n[4/4] Kiem tra ung dung..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3 | Out-Null; $ok = $true; break }
  catch { Start-Sleep -Seconds 3 }
}

Write-Host ""
if ($ok) {
  Write-Host "================ DA XONG ================" -ForegroundColor Green
  Write-Host " Mo: http://localhost:3000  (bam Ctrl+F5 de tai lai trang)" -ForegroundColor Green
  try { Start-Process "http://localhost:3000" } catch {}
} else {
  Write-Host "Ung dung chua phan hoi. Hay chay Xem-Loi.bat va gui ket qua cho ky thuat." -ForegroundColor Yellow
}
EndHere 0
