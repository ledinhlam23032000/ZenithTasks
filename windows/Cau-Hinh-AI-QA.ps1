$ErrorActionPreference = 'Stop'

$RepoDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WebDir = Join-Path $RepoDir 'web'
$SourceDir = Join-Path $WebDir 'src'
$PrismaDir = Join-Path $WebDir 'prisma'
$EnvFile = Join-Path $WebDir '.env.qa.local'
$Container = 'zenith_v2_qa_devsrc'
$Network = 'zenithtasks_default'
$Image = 'zenithtasks-app'
$QaDatabaseMarker = 'zenith_v2_qa'
$QaUrl = 'http://localhost:3300/login'

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

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    if ($null -eq (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Chua tim thay $Name. Hay mo/cai dat cong cu nay roi chay lai."
    }
}

function New-RandomSecret {
    param([Parameter(Mandatory = $true)][int]$Bytes)
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($buffer)
}

function Get-ContainerEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Key
    )

    $lines = @(& docker inspect $Name --format '{{range .Config.Env}}{{println .}}{{end}}')
    if ($LASTEXITCODE -ne 0) {
        throw "Khong doc duoc cau hinh container QA $Name."
    }

    $line = $lines | Where-Object { $_ -like "$Key=*" } | Select-Object -First 1
    if (-not $line) {
        throw "Container QA thieu bien $Key; dung lai de khong suy dien cau hinh."
    }
    return $line.Substring($Key.Length + 1)
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' CAU HINH DEEPSEEK CHO QA CO LAP' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host 'Chi su dung database zenith_v2_qa va container QA port 3300.' -ForegroundColor Yellow
Write-Host 'Khong dong vao app clinic dang chay o port 3000.' -ForegroundColor Yellow
Write-Host ''

Require-Command 'docker'

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop chua san sang. Hay mo Docker Desktop, doi den khi bao Ready roi chay lai.'
}

$existingContainer = @(& docker ps -aq -f "name=^$Container`$") | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1
if ($existingContainer) {
    $databaseUrl = Get-ContainerEnvValue -Name $Container -Key 'DATABASE_URL'
    $authSecret = Get-ContainerEnvValue -Name $Container -Key 'AUTH_SECRET'
    $phoneEncKey = Get-ContainerEnvValue -Name $Container -Key 'PHONE_ENC_KEY'
    if ($databaseUrl -notlike "*$QaDatabaseMarker*") {
        throw 'DATABASE_URL cua container hien tai khong phai database QA; da dung lai de bao ve du lieu clinic.'
    }
}
else {
    Write-Host "Khong co container QA cu; se tao moi $Container tu image da kiem tra." -ForegroundColor Yellow
    $databaseUrl = 'postgresql://zenith:zenith_dev_pw@db:5432/zenith_v2_qa?schema=public'
    $authSecret = New-RandomSecret -Bytes 48
    $phoneEncKey = New-RandomSecret -Bytes 32
}

& docker network inspect $Network *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Khong tim thay Docker network $Network cua QA. Dung lai de khong tao stack ngoai y muon."
}

& docker image inspect $Image *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Khong tim thay image $Image. Hay khoi dong QA stack hien co truoc khi cau hinh AI."
}

$secureKey = Read-Host 'Dan API key DeepSeek moi danh rieng cho QA (khong hien tren man hinh)' -AsSecureString
$apiKey = [System.Net.NetworkCredential]::new('', $secureKey).Password

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw 'API key rong; khong thay doi container QA.'
}
if (-not $apiKey.Trim().StartsWith('sk-', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Key khong co dang sk- quen thuoc cua DeepSeek; khong thay doi container QA.'
}

$envLines = @(
    "DATABASE_URL=$databaseUrl",
    "AUTH_SECRET=$authSecret",
    "PHONE_ENC_KEY=$phoneEncKey",
    'NODE_ENV=development',
    'ENABLE_ZENITH_V2=true',
    'ENABLE_AI_TRAINING_STUDIO=true',
    'AI_PROVIDER=openai',
    ('AI_API_KEY=' + $apiKey.Trim()),
    'AI_BASE_URL=https://api.deepseek.com',
    'AI_MODEL=deepseek-chat',
    'AI_AGENT_MODEL=deepseek-chat'
)
[System.IO.File]::WriteAllLines($EnvFile, $envLines, (New-Object System.Text.UTF8Encoding($false)))
$writtenKeyLine = [System.IO.File]::ReadAllLines($EnvFile) | Where-Object { $_ -match '^AI_API_KEY=' } | Select-Object -First 1
$writtenKeyLength = 0
if ($writtenKeyLine) { $writtenKeyLength = ($writtenKeyLine -split '=', 2)[1].Length }
if (-not $writtenKeyLine -or $writtenKeyLength -lt 10) {
    Remove-Item -LiteralPath $EnvFile -Force -ErrorAction SilentlyContinue
    throw 'Khong xac nhan duoc API key trong env QA; khong khoi dong container.'
}

Write-Host '[1/3] Dung va tao lai container QA, giu nguyen database QA...' -ForegroundColor Yellow
if ($existingContainer) {
    Invoke-Checked 'docker' @('rm', '-f', $Container)
}
else {
    Write-Host 'Khong co container cu; bo qua buoc xoa va tao container QA moi.' -ForegroundColor DarkGray
}

$volumeSource = "$SourceDir`:/app/src"
$volumePrisma = "$PrismaDir`:/app/prisma"
$runArgs = @(
    'run', '-d', '--name', $Container,
    '--network', $Network,
    '-p', '3300:3000',
    '--env-file', $EnvFile,
    '-v', $volumeSource,
    '-v', $volumePrisma,
    $Image,
    'sh', '-lc', 'npx prisma generate && exec node_modules/.bin/next dev -p 3000'
)
Invoke-Checked 'docker' $runArgs | Out-Null
$containerEnvLines = @(& docker inspect $Container --format '{{range .Config.Env}}{{println .}}{{end}}')
$containerKeyLine = $containerEnvLines | Where-Object { $_ -match '^AI_API_KEY=' } | Select-Object -First 1
$containerKeyLength = 0
if ($containerKeyLine) { $containerKeyLength = ($containerKeyLine -split '=', 2)[1].Length }
if (-not $containerKeyLine -or $containerKeyLength -lt 10) {
    & docker rm -f $Container *> $null
    Remove-Item -LiteralPath $EnvFile -Force -ErrorAction SilentlyContinue
    throw 'Container QA khong nhan duoc API key; da dung va xoa container de an toan.'
}

Write-Host '[2/3] Cho app QA va DeepSeek san sang...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 80; $i++) {
    $statusText = ''
    try { $statusText = (& curl.exe -4 -sS --max-time 5 -o NUL -w '%{http_code}' $QaUrl 2>$null | Out-String).Trim() } catch { $statusText = '' }
    if ($statusText -match '^[2-4][0-9][0-9]$') {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 3
}

if (-not $ready) {
    Write-Host 'Khong xac nhan duoc HTTP QA. Xem log container:' -ForegroundColor Red
    & docker logs --tail 120 $Container
    throw "Khong the xac nhan $QaUrl"
}

Write-Host '[3/3] QA DeepSeek da san sang.' -ForegroundColor Green
Write-Host "Mo: $QaUrl" -ForegroundColor Green
Write-Host 'Key chi nam trong file web/.env.qa.local va cau hinh container QA; khong duoc commit file nay.' -ForegroundColor Yellow
Write-Host 'Sau khi test xong, chay windows\Tat-AI-QA.bat de xoa container va file key QA.' -ForegroundColor Yellow
Start-Process $QaUrl
