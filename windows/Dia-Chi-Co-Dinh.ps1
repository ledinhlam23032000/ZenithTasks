$ErrorActionPreference='Continue'
function Has($n){[bool](Get-Command $n -ErrorAction SilentlyContinue)}
Write-Host ''
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host '   ZENITH CLINIC - Dia chi co dinh (24/7)' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
if(-not (Has cloudflared)){
  Write-Host 'Cai cloudflared...' -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
  $env:Path+=';C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared'
}else{Write-Host 'cloudflared: OK' -ForegroundColor Green}
$cf=(Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if(-not $cf){$cf='cloudflared'}
Write-Host ''
Write-Host 'Mo Cloudflare > Zero Trust > Networks > Tunnels, tao 1 tunnel,' -ForegroundColor Yellow
Write-Host 'chon Windows, COPY chuoi TOKEN (phan sau "service install").' -ForegroundColor Yellow
Write-Host ''
$token=Read-Host 'Dan TOKEN vao day roi Enter'
if([string]::IsNullOrWhiteSpace($token)){Write-Host 'Chua co token. Thoat.' -ForegroundColor Red;Read-Host 'Nhan Enter';exit}
& $cf service uninstall *>$null 2>$null
& $cf service install $token.Trim()
Write-Host ''
Write-Host '================ DA CAI DICH VU ================' -ForegroundColor Green
Write-Host ' Tunnel chay NEN 24/7 (ke ca khi dong cua so nay).' -ForegroundColor Green
Write-Host ' Yeu cau: may chu LUON BAT + Docker dang chay.' -ForegroundColor Green
Write-Host ' Mo TEN MIEN cua ban tren trinh duyet de kiem tra.' -ForegroundColor Green
Write-Host '================================================' -ForegroundColor Green
Read-Host 'Nhan Enter de dong'
