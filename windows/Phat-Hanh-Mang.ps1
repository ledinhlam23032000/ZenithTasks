$ErrorActionPreference='Continue'
$Dir=Join-Path $HOME 'ZenithTasks'
function Has($n){[bool](Get-Command $n -ErrorAction SilentlyContinue)}
Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   ZENITH CLINIC - Phat hanh ra Internet' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
if(-not (Test-Path $Dir)){Write-Host 'Chua thay du an. Hay chay Chay-Zenith.bat truoc.' -ForegroundColor Red;Read-Host 'Nhan Enter de thoat';exit}
if(-not (Has docker)){Write-Host 'Chua co Docker. Hay chay Chay-Zenith.bat truoc.' -ForegroundColor Red;Read-Host 'Nhan Enter de thoat';exit}
docker info *>$null
if($LASTEXITCODE -ne 0){Write-Host 'Docker chua chay. Mo Docker Desktop (doi bieu tuong XANH) roi chay lai file nay.' -ForegroundColor Yellow;Read-Host 'Nhan Enter de thoat';exit}
Write-Host '[1/3] Dam bao ung dung dang chay...' -ForegroundColor Yellow
Set-Location $Dir; docker compose up -d *>$null
if(-not (Has cloudflared)){
  Write-Host '[2/3] Cai cloudflared (lan dau)...' -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  $env:Path+=';C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared'
}else{Write-Host '[2/3] cloudflared: OK' -ForegroundColor Green}
$cf=(Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if(-not $cf){$cf='cloudflared'}
Write-Host ''
Write-Host '==================================================' -ForegroundColor Green
Write-Host ' [3/3] DANG TAO DIA CHI INTERNET...' -ForegroundColor Green
Write-Host ' >>> Tim dong co dang:  https://....trycloudflare.com' -ForegroundColor Green
Write-Host ' >>> Gui DIA CHI do cho nhan vien de ho vao lam viec.' -ForegroundColor Green
Write-Host ' >>> GIU CUA SO NAY LUON MO (dong la mat ket noi).' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Green
Write-Host ''
& $cf tunnel --url http://localhost:3000 --no-autoupdate
Write-Host ''
Read-Host 'Tunnel da dung. Nhan Enter de dong'
