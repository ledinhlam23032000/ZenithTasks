# ============================================================================
#  Sao luu du lieu phong kham (CSDL PostgreSQL + anh) ra o dia cua ban.
#  Chay tay: bam dup "Sao-Luu.bat".  Tu dong: chay "Cai-Sao-Luu-Tu-Dong.bat".
# ============================================================================
$ErrorActionPreference = 'Stop'

$RepoDir = (Resolve-Path "$PSScriptRoot\..").Path
$Compose = Join-Path $RepoDir 'docker-compose.yml'

# Noi luu: doc tu file cau hinh; neu chua co thi mac dinh vao thu muc nguoi dung.
$cfgFile = Join-Path $env:USERPROFILE 'zenith-sao-luu.txt'
$BackupRoot = ''
if (Test-Path $cfgFile) { $BackupRoot = (Get-Content $cfgFile -Raw).Trim() }
if ([string]::IsNullOrWhiteSpace($BackupRoot)) { $BackupRoot = Join-Path $env:USERPROFILE 'ZenithBackup' }
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

function Log($m) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m"
  Write-Host $line
  Add-Content -Path (Join-Path $BackupRoot 'sao-luu.log') -Value $line
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$tmp = Join-Path $env:TEMP "zenith-bk-$stamp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

try {
  Log "Bat dau sao luu..."

  # 1) Xuat toan bo CSDL ra file db.sql
  cmd /c "docker compose -f ""$Compose"" exec -T db pg_dump -U zenith -d zenith_clinic > ""$tmp\db.sql"""
  if (-not (Test-Path "$tmp\db.sql") -or (Get-Item "$tmp\db.sql").Length -lt 100) {
    throw "Khong xuat duoc CSDL. Docker/ung dung dang chay chua?"
  }

  # 2) Sao chep thu muc anh (truoc/sau, avatar...)
  cmd /c "docker compose -f ""$Compose"" cp app:/app/public/uploads ""$tmp\uploads""" 2>$null

  # 3) Nen thanh 1 file .zip
  $zip = Join-Path $BackupRoot "zenith-$stamp.zip"
  Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
  $sizeMB = [math]::Round((Get-Item $zip).Length / 1MB, 1)
  Log "Da luu: $zip ($sizeMB MB)"

  # 4) Chi giu ban sao luu trong 30 ngay gan nhat
  Get-ChildItem (Join-Path $BackupRoot 'zenith-*.zip') |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  # 5) Sao chep ra NOI LUU NGOAI (Google Drive / USB / o mang) neu da cau hinh
  $offFile = Join-Path $env:USERPROFILE 'zenith-sao-luu-offsite.txt'
  if (Test-Path $offFile) {
    $offsite = (Get-Content $offFile -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($offsite)) {
      try {
        New-Item -ItemType Directory -Force -Path $offsite | Out-Null
        Copy-Item -Path $zip -Destination $offsite -Force
        Get-ChildItem (Join-Path $offsite 'zenith-*.zip') |
          Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
          Remove-Item -Force -ErrorAction SilentlyContinue
        Log "Da dong bo ra noi luu ngoai: $offsite"
      }
      catch {
        Log "CANH BAO: khong sao chep duoc ra noi luu ngoai ($offsite): $_"
      }
    }
  }

  Log "Hoan tat sao luu."
}
catch {
  Log "LOI: $_"
  throw
}
finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
