$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/ledinhlam23032000/ZenithTasks.git'
$Branch = 'master'
$RepoDir = Join-Path $env:USERPROFILE 'ZenithTasks'
$AppUrl = 'http://localhost:3000'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Lenh that bai ($LASTEXITCODE): $File $($Arguments -join ' ')"
    }
}

function Test-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' ZENITH CLINIC - CAP NHAT MASTER + CHAY UNG DUNG' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

if (-not (Test-Command 'git')) {
    throw 'Chua tim thay Git. Hay cai Git for Windows roi chay lai file nay.'
}

if (-not (Test-Command 'docker')) {
    throw 'Chua tim thay Docker. Hay mo Docker Desktop roi chay lai file nay.'
}

if (-not (Test-Path -LiteralPath $RepoDir)) {
    Write-Host '[1/4] Tai ma nguon master lan dau...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RepoDir) | Out-Null
    Invoke-Checked 'git' @('clone', '--branch', $Branch, $RepoUrl, $RepoDir)
} else {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoDir '.git'))) {
        throw "Thu muc $RepoDir da ton tai nhung khong phai Git repository."
    }

    $trackedChanges = @(
        (& git -C $RepoDir diff --name-only)
        (& git -C $RepoDir diff --cached --name-only)
    ) | Where-Object { $_ -and $_.Trim() }

    if ($trackedChanges.Count -gt 0) {
        Write-Host 'Phat hien thay doi code chua commit; dung lai de khong ghi de cong viec cua ban:' -ForegroundColor Red
        $trackedChanges | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        throw 'Hay commit hoac cat rieng thay doi truoc khi chay launcher.'
    }

    Write-Host '[1/4] Dong bo ma nguon voi GitHub master...' -ForegroundColor Yellow
    Invoke-Checked 'git' @('-C', $RepoDir, 'fetch', 'origin', $Branch, '--prune')

    $hasMaster = @(& git -C $RepoDir branch --format='%(refname:short)') -contains $Branch
    if ($hasMaster) {
        Invoke-Checked 'git' @('-C', $RepoDir, 'switch', $Branch)
    } else {
        Invoke-Checked 'git' @('-C', $RepoDir, 'switch', '-c', $Branch, '--track', "origin/$Branch")
    }

    Invoke-Checked 'git' @('-C', $RepoDir, 'pull', '--ff-only', 'origin', $Branch)
}

Write-Host '[2/4] Kiem tra Docker Desktop...' -ForegroundColor Yellow
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop chua san sang. Hay mo Docker Desktop, doi den khi bao Ready roi chay lai.'
}

Set-Location -LiteralPath $RepoDir
Write-Host '[3/4] Build va khoi dong Docker (migration se tu dong ap dung)...' -ForegroundColor Yellow
Invoke-Checked 'docker' @('compose', 'up', '-d', '--build', '--force-recreate')

Write-Host '[4/4] Cho ung dung san sang...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 80; $i++) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $AppUrl -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 3
    }
}

if (-not $ready) {
    Write-Host 'Ung dung chua tra ve HTTP trong thoi gian cho phep. Nhat log de xem loi:' -ForegroundColor Red
    & docker compose logs --tail 80 app
    throw "Khong the xac nhan $AppUrl"
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' CAP NHAT THANH CONG - UNG DUNG DANG CHAY TAI:' -ForegroundColor Green
Write-Host " $AppUrl" -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Start-Process $AppUrl
