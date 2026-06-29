# ============================================================================
#  TU DONG DOI KHOA MA HOA SO DIEN THOAI (PHONE_ENC_KEY).
#  Gop ca 6 buoc: sao luu -> tao khoa moi -> lay khoa cu -> ma hoa lai toan bo
#  (khach hang + khach tham khao) -> cap nhat .env -> khoi dong lai.
#
#  AN TOAN: neu buoc ma hoa lai bao LOI (con ban ghi giai ma hong) thi script
#  KHONG doi PHONE_ENC_KEY (giu nguyen khoa cu) de khong mat du lieu.
# ============================================================================
$ErrorActionPreference = 'Stop'
$RepoDir = (Resolve-Path "$PSScriptRoot\..").Path
$envFile = Join-Path $RepoDir '.env'
$Compose = Join-Path $RepoDir 'docker-compose.yml'

function Fail($msg) { Write-Host ''; Write-Host "LOI: $msg" -ForegroundColor Red; Read-Host 'Nhan Enter de dong'; exit 1 }

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   DOI KHOA MA HOA SO DIEN THOAI (tu dong)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ' Script se: sao luu -> tao khoa moi -> ma hoa lai TOAN BO so dien'
Write-Host ' thoai khach -> cap nhat .env -> khoi dong lai ung dung.'
Write-Host ''
Write-Host ' * Nen lam luc vang khach. Neu co loi se TU DUNG, khong doi khoa.' -ForegroundColor Yellow
Write-Host ''
$confirm = (Read-Host 'Go chu  DONGY  roi Enter de bat dau (Enter de huy)').Trim()
if ($confirm -ne 'DONGY') { Write-Host 'Da huy.' -ForegroundColor Yellow; Read-Host 'Nhan Enter'; exit }

# --- Bao dam ung dung dang chay ---
Write-Host ''
Write-Host '[0/6] Kiem tra ung dung dang chay...' -ForegroundColor Cyan
docker compose -f "$Compose" up -d | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Khong khoi dong duoc ung dung (docker compose up).' }

# --- 1) Sao luu ---
Write-Host '[1/6] Sao luu du lieu (de phong)...' -ForegroundColor Cyan
docker compose -f "$Compose" exec -T app npm run backup
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Canh bao: sao luu tu dong gap loi.' -ForegroundColor Yellow
  $c2 = (Read-Host 'Van tiep tuc doi khoa? Go CO de tiep, Enter de dung').Trim()
  if ($c2 -ne 'CO') { Write-Host 'Da dung de ban sao luu thu cong truoc.' -ForegroundColor Yellow; Read-Host 'Nhan Enter'; exit }
}

# --- 2) Tao khoa moi (32 byte base64) ---
Write-Host '[2/6] Tao khoa moi...' -ForegroundColor Cyan
$NEW = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))

# --- 3) Lay khoa cu dang dung ---
Write-Host '[3/6] Lay khoa cu dang dung...' -ForegroundColor Cyan
$OLD = $null
if (Test-Path $envFile) {
  $line = (Get-Content $envFile) | Where-Object { $_ -match '^\s*PHONE_ENC_KEY\s*=' } | Select-Object -First 1
  if ($line) { $OLD = ($line -replace '^\s*PHONE_ENC_KEY\s*=', '').Trim().Trim('"').Trim("'") }
}
if ([string]::IsNullOrWhiteSpace($OLD)) {
  # Chua dat trong .env -> doc khoa container tu sinh (mac dinh) trong volume.
  $OLD = (docker compose -f "$Compose" exec -T app sh -lc "cat /app/.runtime/phone_key 2>/dev/null").Trim()
}
if ([string]::IsNullOrWhiteSpace($OLD)) { Fail 'Khong tim duoc khoa cu (ca .env lan container). Hay goi ky thuat.' }

# --- 4) Ma hoa lai toan bo ---
Write-Host '[4/6] Ma hoa lai toan bo so dien thoai (khach hang + khach tham khao)...' -ForegroundColor Cyan
docker compose -f "$Compose" exec -T -e OLD_PHONE_ENC_KEY="$OLD" -e NEW_PHONE_ENC_KEY="$NEW" app npx tsx prisma/rotate-phone-key.ts
if ($LASTEXITCODE -ne 0) { Fail 'Ma hoa lai gap loi -> GIU NGUYEN khoa cu (khong doi gi). Hay goi ky thuat.' }

# --- 5) Cap nhat PHONE_ENC_KEY trong .env (giu nguyen cac dong khac) ---
Write-Host '[5/6] Cap nhat khoa moi vao .env...' -ForegroundColor Cyan
$lines = @()
if (Test-Path $envFile) { $lines = @(Get-Content $envFile) }
$result = @(); $seen = $false
foreach ($l in $lines) {
  if ($l -match '^\s*PHONE_ENC_KEY\s*=') { $result += "PHONE_ENC_KEY=$NEW"; $seen = $true }
  else { $result += $l }
}
if (-not $seen) { $result += "PHONE_ENC_KEY=$NEW" }
[System.IO.File]::WriteAllLines($envFile, $result, (New-Object System.Text.UTF8Encoding($false)))

# Luu ban sao khoa moi ra file rieng de chu cat giu (phong mat .env).
$keyBak = Join-Path $RepoDir ('PHONE_ENC_KEY-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
Set-Content -Path $keyBak -Value $NEW -Encoding UTF8
Write-Host "    Da luu ban sao khoa moi tai: $keyBak  (hay cat giu noi an toan, roi xoa khoi may chu)" -ForegroundColor Yellow

# --- 6) Khoi dong lai ---
Write-Host '[6/6] Khoi dong lai ung dung de ap dung khoa moi...' -ForegroundColor Cyan
docker compose -f "$Compose" up -d --force-recreate | Out-Null

Write-Host ''
Write-Host '================ HOAN TAT ================' -ForegroundColor Green
Write-Host ' Da doi khoa thanh cong. Banner do "khoa MAC DINH" se bien mat.' -ForegroundColor Green
Write-Host ' KIEM TRA: vao 1 ho so khach -> bam "Lien he"/"Hien so" -> phai ra dung so.' -ForegroundColor Green
Write-Host " QUAN TRONG: cat giu file khoa ($keyBak) noi an toan." -ForegroundColor Yellow
Write-Host '==========================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
