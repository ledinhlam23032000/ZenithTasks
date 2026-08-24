$ErrorActionPreference = 'Stop'

$RepoDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EnvFile = Join-Path $RepoDir 'web\.env.qa.local'
$Container = 'zenith_v2_qa_devsrc'

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' TAT QA DEEPSEEK VA XOA SECRET LOCAL' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

$containerId = @(& docker ps -aq -f "name=^$Container`$") | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1
if ($containerId) {
    & docker rm -f $Container
    if ($LASTEXITCODE -ne 0) {
        throw "Khong xoa duoc container QA $Container."
    }
    Write-Host 'Da xoa container QA.' -ForegroundColor Green
}
else {
    Write-Host 'Container QA khong ton tai.' -ForegroundColor DarkGray
}

if (Test-Path -LiteralPath $EnvFile) {
    Remove-Item -LiteralPath $EnvFile -Force
    Write-Host 'Da xoa web\.env.qa.local.' -ForegroundColor Green
}
else {
    Write-Host 'Khong tim thay file env QA.' -ForegroundColor DarkGray
}

Write-Host 'Database zenith_v2_qa va app clinic khong bi xoa.' -ForegroundColor Yellow
Write-Host 'Neu key da tung bi lo, van phai revoke key tai DeepSeek.' -ForegroundColor Yellow
