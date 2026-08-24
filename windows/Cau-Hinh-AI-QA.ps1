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
$QaUrl = 'http://127.0.0.1:3300/login'

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
if (-not $existingContainer) {
    throw "Khong tim thay container QA $Container. Dung lai de khong tu tao tu database clinic."
}

$databaseUrl = Get-ContainerEnvValue -Name $Container -Key 'DATABASE_URL'
$authSecret = Get-ContainerEnvValue -Name $Container -Key 'AUTH_SECRET'
$phoneEncKey = Get-ContainerEnvValue -Name $Container -Key 'PHONE_ENC_KEY'
if ($databaseUrl -notlike "*$QaDatabaseMarker*") {
    throw 'DATABASE_URL cua container hien tai khong phai database QA; da dung lai de bao ve du lieu clinic.'
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
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

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
    'AI_API_KEY=' + $apiKey.Trim(),
    'AI_BASE_URL=https://api.deepseek.com',
    'AI_MODEL=deepseek-chat',
    'AI_AGENT_MODEL=deepseek-chat'
)
[System.IO.File]::WriteAllLines($EnvFile, $envLines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host '[1/3] Dung va tao lai container QA, giu nguyen database QA...' -ForegroundColor Yellow
Invoke-Checked 'docker' @('rm', '-f', $Container)

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

Write-Host '[2/3] Cho app QA va DeepSeek san sang...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 80; $i++) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $QaUrl -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $ready = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
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
