# ============================================================================
#  Bat tinh nang AI: nhap API key Anthropic (Claude) va luu vao .env, roi khoi
#  dong lai ung dung. Khong lam mat cac cai dat khac trong .env.
# ============================================================================
$ErrorActionPreference = 'Stop'
$RepoDir = (Resolve-Path "$PSScriptRoot\..").Path
$envFile = Join-Path $RepoDir '.env'
$Compose = Join-Path $RepoDir 'docker-compose.yml'

Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   BAT AI - Nhap API key Anthropic (Claude)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host 'Lay key tai: https://console.anthropic.com  (API Keys -> Create Key)'
Write-Host 'Key bat dau bang: sk-ant-...'
Write-Host ''
$key = (Read-Host 'Dan API key vao day roi Enter').Trim()
if ([string]::IsNullOrWhiteSpace($key)) { Write-Host 'Chua nhap key. Thoat.' -ForegroundColor Red; Read-Host 'Nhan Enter'; exit }

# Cap nhat (hoac them) dong ANTHROPIC_API_KEY, giu nguyen cac dong khac.
$lines = @()
if (Test-Path $envFile) { $lines = @(Get-Content $envFile) }
$result = @()
$found = $false
foreach ($l in $lines) {
  if ($l -match '^\s*ANTHROPIC_API_KEY\s*=') { $result += "ANTHROPIC_API_KEY=$key"; $found = $true }
  else { $result += $l }
}
if (-not $found) { $result += "ANTHROPIC_API_KEY=$key" }

# Ghi file UTF-8 KHONG BOM (tranh loi doc bien dau tien).
[System.IO.File]::WriteAllLines($envFile, $result, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Da luu key vao: $envFile" -ForegroundColor Green

Write-Host 'Dang khoi dong lai ung dung de ap dung...' -ForegroundColor Yellow
docker compose -f "$Compose" up -d

Write-Host ''
Write-Host '================ DA BAT AI ================' -ForegroundColor Green
Write-Host ' Vao app -> mo ho so 1 khach -> o "Cham soc khach hang"' -ForegroundColor Green
Write-Host ' se thay nut "AI soan tin".' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
