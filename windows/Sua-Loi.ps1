# ============================================================================
#  SUA LOI / CAP NHAT SACH - Zenith Clinic (Trung tam PTTH Tham my, BVDK Hong Phuc)
#  Tai lai ma moi nhat + build co cache an toan + ap dung cap nhat CSDL.
#  Dat ZENITH_FORCE_NO_CACHE=true neu can build lai toan bo image mot cach co chu y.

#  KHONG mat du lieu (du lieu nam trong volume Docker rieng).
# ============================================================================
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "master"
$Dir    = Join-Path $HOME "ZenithTasks"
$Stamp  = Get-Date -Format "yyyyMMdd-HHmmss"

function EndHere($code) { Write-Host ""; exit $code }

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
    # KHONG dung --include-untracked + pathspec exclude o day. Tren mot so
    # Git for Windows, pathspec `.` van quet checks/qa-chrome-profile va
    # repository long worktrees; Git in canh bao ignored path va tra exit code
    # loi du stash da tao mot phan. Day la dung loi owner gap ngay 24/08.
    #
    # Chien luoc an toan: stash TRACKED changes khong co pathspec. Git se khong
    # dong vao ignored QA profile, .env, log hoac worktree untracked; reset --hard
    # cung khong xoa untracked. Backup branch giu moc HEAD truoc cap nhat,
    # stash giu patch/index cua moi file tracked dang sua.
    $stashOutput = & git -C $Dir stash push -m "Sua-Loi $Stamp - bao luu thay doi tracked truoc khi cap nhat master" 2>&1
    $stashExit = $LASTEXITCODE
    $stashOutput | Write-Host
    if ($stashExit -ne 0) {
      Write-Host "Khong bao luu duoc thay doi tracked; dung de tranh mat du lieu." -ForegroundColor Red
      EndHere 1
    }
    $leftoverLocal = & git -C $Dir status --short --untracked-files=all
    if ($leftoverLocal) {
      Write-Host "Giu nguyen file untracked/ignored local (khong xoa, khong dua vao stash):" -ForegroundColor Yellow
      $leftoverLocal | Select-Object -First 20 | Write-Host
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
  # Neu untracked local trung duong dan voi file tracked moi tren origin, Git se tu choi checkout.
  # Chuyen rieng cac path xung dot vao backup ngoai repo; khong xoa va khong stash untracked.
  $incomingFiles = @(& git -C $Dir ls-tree -r --name-only "origin/$Branch" 2>$null)
  $untrackedLines = @(& git -C $Dir status --porcelain=v1 --untracked-files=all | Where-Object { $_ -match '^\?\? ' })
  $conflictingUntracked = @()
  foreach ($line in $untrackedLines) {
    $relative = ([string]$line).Substring(3).Trim('"')
    if (-not $relative) { continue }
    $hasConflict = $incomingFiles -contains $relative -or ($incomingFiles | Where-Object { $_ -like "$relative/*" } | Select-Object -First 1)
    if ($hasConflict) { $conflictingUntracked += $relative }
  }
  if ($conflictingUntracked.Count -gt 0) {
    $untrackedBackup = Join-Path (Split-Path $Dir -Parent) "ZenithTasks-untracked-$Stamp"
    foreach ($relative in ($conflictingUntracked | Sort-Object -Unique)) {
      $source = Join-Path $Dir $relative
      if (-not (Test-Path -LiteralPath $source)) { continue }
      $destination = Join-Path $untrackedBackup $relative
      New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
      Move-Item -LiteralPath $source -Destination $destination -Force
    }
    Write-Host "Da bao toan untracked xung dot tai: $untrackedBackup" -ForegroundColor Yellow
  }
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

Write-Host "`n[2/4] Build va dung lai ung dung (vui long cho, khong tat cua so)..." -ForegroundColor Cyan

# Docker Compose ban moi co the chuyen build qua Bake. Tren mot so may Windows,
# Bake bi ngat voi ma 0xc000013a du build chua xong. Tat Bake va gom ca stdout/stderr
# vao log co timestamp de lay duoc loi that thay vi thong bao tong quat. Dung cache
# de lan cap nhat thong thuong nhanh va it phu thuoc mang; force no-cache chi khi can.

$env:COMPOSE_BAKE = "false"
$BuildLog = Join-Path $Dir "docker-build-$Stamp.log"
Write-Host "Log build: $BuildLog" -ForegroundColor DarkGray
Write-Host "Docker dang build; dong nay se cap nhat lien tuc. Neu co loi, log van duoc ghi ngay." -ForegroundColor DarkGray
# Không dùng pipeline Tee-Object hoặc Start-Process hidden cho BuildKit: trên một
# số PowerShell/Git for Windows, các cách đó giữ host mở dù compose/buildx đã
# ghi `DONE`. Gọi trực tiếp với redirect file để PowerShell chờ đúng Docker
# client và nhận `$LASTEXITCODE`; progress plain giúp log không phụ thuộc TTY.
$BuildErr = Join-Path $Dir "docker-build-$Stamp.err.log"
$buildArgs = @("--progress", "plain", "build")
if ($env:ZENITH_FORCE_NO_CACHE -eq "true") { $buildArgs += "--no-cache"; Write-Host "Build mode: FORCE NO-CACHE" -ForegroundColor Yellow } else { Write-Host "Build mode: CACHE-ENABLED" -ForegroundColor DarkGray }
& docker compose @buildArgs app > $BuildLog 2> $BuildErr

$buildExit = $LASTEXITCODE
Write-Host ""
if ($buildExit -ne 0) {
  Write-Host "`nBUILD THAT BAI - ung dung VAN chay ban cu (khong hong them)." -ForegroundColor Red
  Write-Host "Ma loi build: $buildExit" -ForegroundColor Yellow
  Write-Host "Log chi tiet: $BuildLog" -ForegroundColor Yellow
  Write-Host "Neu ma loi la 0xc000013a, tien trinh build da bi ngat truoc khi Next.js bao loi; giu log lai va chay lai sau khi Docker Desktop on dinh." -ForegroundColor Yellow

  EndHere 1
}

Write-Host "`n[3/4] Khoi dong lai + ap dung cap nhat co so du lieu..." -ForegroundColor Cyan
docker compose up -d --no-deps --force-recreate app
if ($LASTEXITCODE -ne 0) {
  Write-Host "Khong khoi dong duoc container app; khong the ket luan phien ban cu van dang phuc vu." -ForegroundColor Red
  Write-Host "Database khong bi recreate boi lenh nay. Hay chay Xem-Loi.bat truoc khi thu lai." -ForegroundColor Yellow
  EndHere 1
}
Start-Sleep -Seconds 10
Write-Host "Ap dung migration:" -ForegroundColor Cyan
$MigrationLog = Join-Path $Dir "docker-migrate-$Stamp.log"
$MigrationErr = Join-Path $Dir "docker-migrate-$Stamp.err.log"
& docker compose exec -T app npx prisma migrate deploy > $MigrationLog 2> $MigrationErr
$migrationExit = $LASTEXITCODE
Write-Host ""
if ($migrationExit -ne 0) {
  Write-Host "Migration that bai (ma $migrationExit). Khong tiep tuc smoke test." -ForegroundColor Red
  Write-Host "Log migration: $MigrationLog" -ForegroundColor Yellow
  EndHere 1
}

Write-Host "`n[4/4] Kiem tra ung dung..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest "http://127.0.0.1:3000/login" -UseBasicParsing -TimeoutSec 3 | Out-Null; $ok = $true; break }
  catch { Start-Sleep -Seconds 3 }
}

Write-Host ""
if ($ok) {
  Write-Host "================ DA XONG ================" -ForegroundColor Green
  Write-Host " Mo: http://127.0.0.1:3000  (bam Ctrl+F5 de tai lai trang)" -ForegroundColor Green
  try { Start-Process "http://127.0.0.1:3000" } catch {}
} else {
  Write-Host "Ung dung chua phan hoi. Hay chay Xem-Loi.bat va gui ket qua cho ky thuat." -ForegroundColor Yellow
}
EndHere 0
