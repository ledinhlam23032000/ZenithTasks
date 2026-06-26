# ============================================================================
#  SUA LOI / CAP NHAT SACH - Zenith Clinic (Trung tam PTTH Tham my, BVDK Hong Phuc)
#  Tai lai ma moi nhat + dung lai tu dau (khong cache) + ap dung cap nhat CSDL.
#  KHONG mat du lieu (du lieu nam trong volume Docker rieng).
# ============================================================================
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "claude/lucid-cori-fg136w"
$Dir    = Join-Path $HOME "ZenithTasks"

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
  git -C $Dir fetch origin $Branch 2>&1 | Write-Host
  git -C $Dir reset --hard "origin/$Branch" 2>&1 | Write-Host
} else {
  git clone $Repo $Dir 2>&1 | Write-Host
  git -C $Dir checkout $Branch 2>&1 | Write-Host
}
Set-Location $Dir

Write-Host "`n[2/4] Dung lai ung dung tu dau (lau ~5-15 phut, vui long cho - dung tat)..." -ForegroundColor Cyan
docker compose build --no-cache app
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nBUILD THAT BAI - ung dung VAN chay ban cu (khong hong them)." -ForegroundColor Red
  Write-Host "Thuong do may thieu RAM khi build. Dong bot ung dung roi chay lai, hoac bao ky thuat." -ForegroundColor Yellow
  EndHere 1
}

Write-Host "`n[3/4] Khoi dong lai + ap dung cap nhat co so du lieu..." -ForegroundColor Cyan
docker compose up -d --force-recreate
Start-Sleep -Seconds 10
Write-Host "Ap dung migration:" -ForegroundColor Cyan
docker compose exec -T app npx prisma migrate deploy 2>&1 | Write-Host

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
