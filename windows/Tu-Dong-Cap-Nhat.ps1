# ============================================================================
#  TU DONG CAP NHAT - Zenith Clinic (chay NGAM boi Windows Task Scheduler).
#  Kiem tra co ban moi tren GitHub khong; neu co moi cap nhat + dung lai app.
#  Neu build loi: GIU NGUYEN ban dang chay (khong lam gian doan phong kham).
#  Ghi lai nhat ky vao zenith-tu-dong-cap-nhat.log de xem lai khi can.
# ============================================================================
$ErrorActionPreference = 'Stop'
$Repo   = "https://github.com/ledinhlam23032000/ZenithTasks.git"
$Branch = "master"
$Dir    = Join-Path $HOME "ZenithTasks"
$Log    = Join-Path $env:USERPROFILE "zenith-tu-dong-cap-nhat.log"

function Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $Log -Value $line -Encoding UTF8
}

try {
  if (-not (Test-Path $Dir)) { Log "Chua thay thu muc du an ($Dir) - bo qua."; exit 0 }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Log "Chua co Git - bo qua."; exit 0 }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Log "Chua co Docker - bo qua."; exit 0 }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) { Log "Docker Desktop chua chay - bo qua lan nay."; exit 0 }

  Set-Location $Dir
  git fetch origin $Branch 2>&1 | Out-Null
  $local  = (git rev-parse HEAD).Trim()
  $remote = (git rev-parse "origin/$Branch").Trim()

  if ($local -eq $remote) {
    Log "Da la ban moi nhat ($($local.Substring(0,7))) - khong can cap nhat."
    exit 0
  }

  Log "Phat hien ban moi: $($local.Substring(0,7)) -> $($remote.Substring(0,7)). Dang cap nhat..."
  $dirty = git status --porcelain --untracked-files=all
  if ($dirty) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupBranch = "backup/tu-dong-cap-nhat-$stamp"
    git branch $backupBranch $local 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log "Khong tao duoc backup branch; bo qua cap nhat de tranh mat thay doi local."; exit 1 }
    git stash push --include-untracked -m "Tu-Dong-Cap-Nhat $stamp - bao luu thay doi local" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Log "Khong bao luu duoc thay doi local; bo qua cap nhat de tranh mat thay doi."; exit 1 }
    Log "Da bao ve thay doi local trong branch $backupBranch va stash; khong tu dong khoi phuc de tranh de len master."
  }
  git reset --hard "origin/$Branch" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Log "RESET THAT BAI sau khi da backup; dung cap nhat."; exit 1 }

  docker compose build app 2>&1 | Out-File -Append -Encoding UTF8 $Log
  if ($LASTEXITCODE -ne 0) {
    Log "BUILD THAT BAI - ung dung VAN CHAY BAN CU, khong bi gian doan. Hay chay Sua-Loi.bat de xem chi tiet."
    exit 1
  }

  docker compose up -d --force-recreate 2>&1 | Out-File -Append -Encoding UTF8 $Log
  Start-Sleep -Seconds 10
  docker compose exec -T app npx prisma migrate deploy 2>&1 | Out-File -Append -Encoding UTF8 $Log

  $ok = $false
  for ($i = 0; $i -lt 20; $i++) {
    try { Invoke-WebRequest "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3 | Out-Null; $ok = $true; break }
    catch { Start-Sleep -Seconds 3 }
  }

  if ($ok) {
    Log "CAP NHAT THANH CONG. Ung dung dang chay ban moi ($($remote.Substring(0,7)))."
  } else {
    Log "Da cap nhat nhung ung dung chua phan hoi - hay kiem tra thu cong (Mo-App.bat / Xem-Loi.bat)."
  }
} catch {
  Log "LOI KHONG XU LY DUOC: $_"
}
