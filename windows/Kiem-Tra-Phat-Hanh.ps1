# ============================================================================
# KIEM TRA PHAT HANH - ZenithTasks
# Chi doc: khong build, reset, migrate, stop, recreate, xoa volume hay sua cau hinh.
# Dung truoc/sau khi cap nhat de co mot bien ban nhat quan.
# ============================================================================
$ErrorActionPreference = 'Continue'
$RepoDir = Split-Path -Parent $PSScriptRoot
$OriginUrl = 'http://127.0.0.1:3000/login'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$report = Join-Path $RepoDir "checks\release-verification-$stamp.txt"
$lines = New-Object System.Collections.Generic.List[string]

function Add-Result {
    param([string]$Name, [string]$Status, [string]$Detail)
    $line = "[$Status] $Name :: $Detail"
    $lines.Add($line)
    $color = if ($Status -eq 'PASS') { 'Green' } elseif ($Status -eq 'WARN') { 'Yellow' } else { 'Red' }
    Write-Host $line -ForegroundColor $color
}

function Invoke-ReadOnly {
    param([string]$Name, [scriptblock]$Command)
    try {
        $output = (& $Command 2>&1 | Out-String).Trim()
        $code = $LASTEXITCODE
        if ($code -eq 0) { Add-Result $Name 'PASS' ($output -replace '\s+', ' ') }
        else { Add-Result $Name 'FAIL' "exit=$code; $($output -replace '\s+', ' ')" }
        return $output
    } catch {
        Add-Result $Name 'FAIL' $_.Exception.Message
        return ''
    }
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' ZENITHTASKS - KIEM TRA PHAT HANH (CHI DOC)' -ForegroundColor Cyan
Write-Host " Bao cao: $report" -ForegroundColor DarkGray
Write-Host '============================================================' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
    Add-Result 'Git repository' 'FAIL' "Khong tim thay .git tai $RepoDir"
} else {
    $status = (& git -C $RepoDir status --short --untracked-files=all 2>&1 | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($status)) { Add-Result 'Git working tree' 'PASS' 'Sach' }
    else { Add-Result 'Git working tree' 'WARN' 'Dang co thay doi local/untracked; khong tu dong xu ly' }
    Invoke-ReadOnly 'Git HEAD' { git -C $RepoDir rev-parse --short HEAD } | Out-Null
    Invoke-ReadOnly 'Git branch' { git -C $RepoDir branch --show-current } | Out-Null
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Add-Result 'Docker CLI' 'FAIL' 'Khong tim thay docker'
} else {
    Invoke-ReadOnly 'Docker engine' { docker info } | Out-Null
    $compose = Invoke-ReadOnly 'Compose status' { docker compose -f (Join-Path $RepoDir 'docker-compose.yml') ps } 
    $appState = Invoke-ReadOnly 'App container state' { docker inspect zenithtasks-app-1 --format '{{.State.Status}}|{{.State.Health.Status}}|{{.Image}}' }
    $dbState = Invoke-ReadOnly 'DB container state' { docker inspect zenithtasks-db-1 --format '{{.State.Status}}|{{.State.Health.Status}}' }
    Invoke-ReadOnly 'Migration status' { docker compose -f (Join-Path $RepoDir 'docker-compose.yml') exec -T app npx prisma migrate status } | Out-Null
}

try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $OriginUrl -TimeoutSec 5
    if ($response.StatusCode -eq 200) { Add-Result 'IPv4 HTTP login' 'PASS' "$OriginUrl -> HTTP $($response.StatusCode)" }
    else { Add-Result 'IPv4 HTTP login' 'WARN' "$OriginUrl -> HTTP $($response.StatusCode)" }
} catch {
    Add-Result 'IPv4 HTTP login' 'FAIL' $_.Exception.Message
}

$cf = Get-Service -Name 'Cloudflared' -ErrorAction SilentlyContinue
if ($null -eq $cf) { Add-Result 'Cloudflared Windows service' 'WARN' 'Khong tim thay service Cloudflared' }
elseif ($cf.Status -eq 'Running') { Add-Result 'Cloudflared Windows service' 'PASS' "Running (StartType=$($cf.StartType))" }
else { Add-Result 'Cloudflared Windows service' 'FAIL' "Status=$($cf.Status)" }

$metricsUrls = @('http://127.0.0.1:20241/metrics', 'http://127.0.0.1:20241/ready')
$metricsFound = $false
foreach ($metricsUrl in $metricsUrls) {
    try {
        $m = Invoke-WebRequest -UseBasicParsing -Uri $metricsUrl -TimeoutSec 2
        $metricsFound = $true
        Add-Result "Cloudflared endpoint $metricsUrl" 'PASS' "HTTP $($m.StatusCode)"
        break
    } catch { }
}
if (-not $metricsFound) { Add-Result 'Cloudflared metrics/ready endpoint' 'WARN' 'Khong truy cap duoc endpoint metrics/ready mac dinh; can xem dashboard neu can doi chieu request errors' }

$lines | Set-Content -Path $report -Encoding UTF8
Write-Host ''
Write-Host "Da luu bao cao: $report" -ForegroundColor Cyan
Write-Host 'Luu y: script nay khong tu dong sua, build, migrate, restart hay xoa du lieu.' -ForegroundColor Yellow
Read-Host 'Nhan Enter de dong cua so'
